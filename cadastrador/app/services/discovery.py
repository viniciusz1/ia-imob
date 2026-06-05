from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass, field
from typing import Any

import httpx
from lxml import etree


DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; CadastradorBot/0.1)"
MAX_SAMPLE_HTMLS = 5

MIN_TOURNAMENT_SAMPLE = 20
MAX_TOURNAMENT_SAMPLE = 60
TOURNAMENT_SAMPLE_RATIO = 0.30


def sample_urls(urls: list[str]) -> list[str]:
    """Pick the Amostra de Torneio: ~30% of the sitemap, clamped to [20, 60], strided.

    Strided selection spreads the sample across the whole list (layout/type
    diversity) instead of taking a contiguous prefix.
    """
    total = len(urls)
    if total == 0:
        return []
    target = min(
        total,
        max(
            MIN_TOURNAMENT_SAMPLE,
            min(MAX_TOURNAMENT_SAMPLE, round(total * TOURNAMENT_SAMPLE_RATIO)),
        ),
    )
    step = total / target
    return [urls[int(index * step)] for index in range(target)]

PROPERTY_PATTERNS = re.compile(
    r"/(imovel|imoveis|propriedade|propriedades|comprar|alugar|"
    r"detalhe|detalhes|apartamento|apartamentos|casa|casas|"
    r"venda|locacao|aluguel|terreno|cobertura|sala-comercial|"
    r"sobrado|chacara|fazenda|sitio|studio|kitnet|flat|"
    r"loja|barracao|galpao|galpão|galpo|loteamento|lote|construcao|"
    r"comercial|residencial|rural)(?:/|-|$|\d)",
    re.IGNORECASE,
)
NON_PROPERTY_PATTERNS = re.compile(
    r"/(blog|noticias|artigos|news|category|tag|author|page|sobre|about|"
    r"contato|politica|termos|privacidade|wp-admin|wp-content|admin|login|"
    r"search|busca|feed|sitemap|mapa|corretores?|institucional|api)"
    r"(?:/|-|$|\.)",
    re.IGNORECASE,
)


class HttpFetcher:
    def __init__(self, timeout: float = 15.0, retries: int = 2) -> None:
        self.timeout = timeout
        self.retries = retries

    async def fetch(self, url: str) -> str:
        last_error: Exception | None = None
        for attempt in range(self.retries + 1):
            try:
                async with httpx.AsyncClient(
                    timeout=self.timeout,
                    follow_redirects=True,
                    headers={"User-Agent": DEFAULT_USER_AGENT},
                ) as client:
                    response = await client.get(url)
                    if response.status_code >= 500 and attempt < self.retries:
                        await asyncio.sleep(0.5 * (2**attempt))
                        continue
                    response.raise_for_status()
                    return response.text
            except (httpx.TimeoutException, httpx.TransportError, httpx.HTTPStatusError) as exc:
                last_error = exc
                if attempt < self.retries:
                    await asyncio.sleep(0.5 * (2**attempt))
                    continue
                raise
        assert last_error is not None
        raise last_error

    async def fetch_many(self, urls: list[str], max_count: int = MAX_SAMPLE_HTMLS) -> list[str]:
        htmls: list[str] = []
        for url in urls[:max_count]:
            try:
                htmls.append(await self.fetch(url))
            except httpx.HTTPError:
                continue
        return htmls

    async def fetch_pairs(
        self,
        urls: list[str],
        *,
        concurrency: int = 8,
    ) -> list[tuple[str, str]]:
        """Fetch URLs concurrently (bounded for politeness), returning aligned
        (url, html) pairs in input order and skipping individual failures."""
        semaphore = asyncio.Semaphore(concurrency)

        async def fetch_one(url: str) -> tuple[str, str] | None:
            async with semaphore:
                try:
                    return url, await self.fetch(url)
                except Exception:
                    return None

        results = await asyncio.gather(*(fetch_one(url) for url in urls))
        return [pair for pair in results if pair is not None]


@dataclass
class SitemapProbeResult:
    property_urls: list[str]
    selected_sitemap_url: str
    sitemap_scores: list[tuple[str, int]] = field(default_factory=list)
    detection_method: str = "keyword"


def _strip_namespace(tag: str) -> str:
    return tag.split("}", 1)[-1] if "}" in tag else tag


def _parse_sitemap(xml_text: str) -> tuple[str, list[str]] | None:
    try:
        root = etree.fromstring(xml_text.encode("utf-8"))
    except etree.XMLSyntaxError:
        return None
    kind = _strip_namespace(root.tag).lower()
    if kind not in {"urlset", "sitemapindex"}:
        return None
    locs: list[str] = []
    for loc in root.iter():
        if _strip_namespace(loc.tag).lower() == "loc" and loc.text:
            locs.append(loc.text.strip())
    return kind, locs


@dataclass
class _UrlsetMeta:
    sitemap_url: str
    total_urls: int
    keyword_count: int
    exclusion_count: int

    @property
    def candidate_count(self) -> int:
        return self.total_urls - self.exclusion_count


class SitemapProbe:
    def __init__(self, fetcher: HttpFetcher) -> None:
        self.fetcher = fetcher

    async def probe(self, domain: str) -> SitemapProbeResult | None:
        metas: list[_UrlsetMeta] = []
        await self._collect(f"https://{domain}/sitemap.xml", metas, set(), 0)
        if not metas:
            return None

        keyword_metas = [meta for meta in metas if meta.keyword_count > 0]
        if keyword_metas:
            urls: list[str] = []
            for meta in keyword_metas:
                parsed = _parse_sitemap(await self.fetcher.fetch(meta.sitemap_url))
                if parsed and parsed[0] == "urlset":
                    urls.extend([url for url in parsed[1] if PROPERTY_PATTERNS.search(url)])
            if urls:
                best = max(keyword_metas, key=lambda meta: meta.keyword_count)
                return SitemapProbeResult(
                    property_urls=urls,
                    selected_sitemap_url=best.sitemap_url,
                    sitemap_scores=[(meta.sitemap_url, meta.keyword_count) for meta in metas],
                )

        candidates = [meta for meta in metas if meta.candidate_count >= 8]
        if not candidates:
            return None
        best = max(candidates, key=lambda meta: meta.candidate_count)
        parsed = _parse_sitemap(await self.fetcher.fetch(best.sitemap_url))
        if not parsed or parsed[0] != "urlset":
            return None
        urls = [url for url in parsed[1] if not NON_PROPERTY_PATTERNS.search(url)]
        if len(urls) < 8:
            return None
        return SitemapProbeResult(
            property_urls=urls,
            selected_sitemap_url=best.sitemap_url,
            sitemap_scores=[(meta.sitemap_url, meta.candidate_count) for meta in metas],
            detection_method="volume",
        )

    async def _collect(
        self,
        sitemap_url: str,
        metas: list[_UrlsetMeta],
        seen: set[str],
        depth: int,
    ) -> None:
        if depth > 3 or sitemap_url in seen:
            return
        seen.add(sitemap_url)
        try:
            parsed = _parse_sitemap(await self.fetcher.fetch(sitemap_url))
        except Exception:
            return
        if not parsed:
            return
        kind, locs = parsed
        if kind == "urlset":
            metas.append(
                _UrlsetMeta(
                    sitemap_url=sitemap_url,
                    total_urls=len(locs),
                    keyword_count=sum(1 for url in locs if PROPERTY_PATTERNS.search(url)),
                    exclusion_count=sum(1 for url in locs if NON_PROPERTY_PATTERNS.search(url)),
                )
            )
            return
        for child in locs:
            await self._collect(child, metas, seen, depth + 1)


OG_PATTERN = re.compile(
    r'<meta\s+[^>]*property=["\']og:([^"\']+)["\'][^>]*content=["\']([^"\']*)["\']',
    re.IGNORECASE | re.DOTALL,
)
JSONLD_PATTERN = re.compile(
    r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)


def extract_structured_data(html: str) -> dict[str, Any]:
    og = {match.group(1).lower(): match.group(2) for match in OG_PATTERN.finditer(html)}
    jsonld: list[Any] = []
    for match in JSONLD_PATTERN.finditer(html):
        try:
            jsonld.append(json.loads(match.group(1).strip()))
        except json.JSONDecodeError:
            continue
    return {"og": og, "jsonld": jsonld}


def decide_execution_model(html: str, sitemap_urls: list[str] | None) -> str:
    if sitemap_urls:
        return "sitemap"
    structured = extract_structured_data(html)
    return "wsm" if structured["og"] or structured["jsonld"] else "unsupported"

