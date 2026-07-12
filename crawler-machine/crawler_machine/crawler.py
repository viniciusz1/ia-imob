from __future__ import annotations

import asyncio
import json
from types import SimpleNamespace
from typing import Any

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from crawl4ai.async_dispatcher import MemoryAdaptiveDispatcher
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy, JsonXPathExtractionStrategy

from crawler_machine.config import CrawlerConfig, FieldConfig
from crawler_machine.extraction.result import CrawlResult
from crawler_machine.normalization.legacy import DataNormalizer

_DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)



class ImovelCrawler:
    """Executa a extração estruturada em uma lista de URLs."""

    def __init__(
        self,
        config: CrawlerConfig,
        fields: list[FieldConfig],
        schema: dict[str, Any] | None = None,
    ):
        self._config = config
        self._fields = fields
        self._schema = schema or {}
        self._normalizer = DataNormalizer()

    async def crawl(self, urls: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Crawlea as URLs em lotes e retorna (dados normalizados, erros)."""
        data: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        for index, chunk in enumerate(self._chunks(urls, self._config.chunk_size)):
            if index > 0 and self._config.chunk_delay > 0:
                await asyncio.sleep(self._config.chunk_delay)

            results = await self._default_runner(chunk)

            for result in results:
                if not result.success:
                    errors.append({"url": result.url, "error": result.error or "unknown error"})
                    continue

                enriched = self._enrich_records(result)
                normalized = self._normalizer.normalize_many(enriched, self._fields)
                data.extend(normalized)

        return data, errors

    def crawl_sync(self, urls: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Versão síncrona de ``crawl``."""
        return asyncio.run(self.crawl(urls))

    def _enrich_records(self, result: CrawlResult) -> list[dict[str, Any]]:
        """Adiciona URL da página e imagem aos registros extraídos."""
        field_names = {field.name for field in self._fields}
        enriched: list[dict[str, Any]] = []

        for record in result.data:
            if not isinstance(record, dict):
                continue

            enriched_record = dict(record)

            if "url" in field_names:
                enriched_record["url"] = result.url

            if "imagem" in field_names and not enriched_record.get("imagem"):
                first_image = result.images[0] if result.images else None
                if first_image:
                    enriched_record["imagem"] = first_image

            enriched.append(enriched_record)

        return enriched

    async def _default_runner(self, urls: list[str]) -> list[CrawlResult]:
        """Crawlear várias URLs usando Crawl4AI com arun_many e retry."""
        results = await self._run_with_retry(urls)
        return [self._adapt_result(result) for result in results]

    async def _run_with_retry(self, urls: list[str]) -> list[Any]:
        """Executa o crawl com retry em URLs que falharem por timeout."""
        pending = list(urls)
        all_results: list[Any] = []

        for attempt in range(self._config.retry_attempts):
            if not pending:
                break

            results = await self._run_once(pending)
            pending = []

            for result in results:
                if not result.success and self._is_transient_error(result.error_message):
                    pending.append(result.url)
                else:
                    all_results.append(result)

            if pending and attempt < self._config.retry_attempts - 1:
                delay = self._config.retry_base_delay * (2 ** attempt)
                await asyncio.sleep(delay)

        # Re-adiciona as URLs que esgotaram as tentativas como falhas.
        for url in pending:
            all_results.append(
                SimpleNamespace(
                    url=url,
                    success=False,
                    error_message="Max retry attempts exceeded",
                    extracted_content=None,
                    media={},
                )
            )

        return all_results

    @staticmethod
    def _is_transient_error(error_message: str | None) -> bool:
        """Verifica se o erro parece transitório (timeout, navegação, etc.)."""
        if not error_message:
            return False
        lowered = error_message.lower()
        return any(
            keyword in lowered
            for keyword in ("timeout", "timed out", "navigation", "navigating", "net::")
        )

    async def _run_once(self, urls: list[str]) -> list[Any]:
        """Executa um único batch de crawls no Crawl4AI."""
        schema_type = self._detect_schema_type(self._schema)
        if schema_type == "XPATH":
            extraction_strategy = JsonXPathExtractionStrategy(schema=self._schema)
        else:
            extraction_strategy = JsonCssExtractionStrategy(schema=self._schema)

        browser_config = BrowserConfig(
            headless=self._config.headless,
            viewport_width=1366,
            viewport_height=768,
            user_agent=self._config.user_agent or _DEFAULT_USER_AGENT,
            enable_stealth=self._config.enable_stealth,
        )
        crawler_config = CrawlerRunConfig(
            extraction_strategy=extraction_strategy,
            wait_for="css:body",
            wait_until=self._config.wait_until,
            page_timeout=self._config.page_timeout,
            remove_overlay_elements=True,
            cache_mode=self._resolve_cache_mode(self._config.cache_mode),
            mean_delay=self._config.mean_delay,
            max_range=self._config.max_range,
            simulate_user=True,
        )
        dispatcher = MemoryAdaptiveDispatcher(
            memory_threshold_percent=80.0,
            max_session_permit=self._config.max_concurrent,
        )

        async with AsyncWebCrawler(config=browser_config) as crawler:
            results = await crawler.arun_many(
                urls=urls,
                config=crawler_config,
                dispatcher=dispatcher,
            )

        return list(results)

    @staticmethod
    def _resolve_cache_mode(mode: str | None) -> CacheMode:
        """Converte string de configuração para enum do Crawl4AI."""
        mapping = {
            "ENABLED": CacheMode.ENABLED,
            "BYPASS": CacheMode.BYPASS,
            "DISABLED": CacheMode.DISABLED,
            "READ_ONLY": CacheMode.READ_ONLY,
            "WRITE_ONLY": CacheMode.WRITE_ONLY,
        }
        return mapping.get((mode or "ENABLED").upper(), CacheMode.ENABLED)

    def _adapt_result(self, result: Any) -> CrawlResult:
        """Converte um resultado do Crawl4AI para o formato interno."""
        if not result.success:
            return CrawlResult(
                url=result.url,
                success=False,
                data=[],
                error=result.error_message,
            )

        try:
            data = json.loads(result.extracted_content)
        except (json.JSONDecodeError, TypeError):
            data = []

        if isinstance(data, dict):
            data = data.get(self._schema.get("name", "items"), [])

        images = self._extract_images(result)
        html = getattr(result, "html", None)
        return CrawlResult(
            url=result.url,
            success=True,
            data=data if isinstance(data, list) else [],
            images=images,
            html=html,
        )

    @staticmethod
    def _chunks(items: list[str], size: int) -> list[list[str]]:
        """Divide uma lista em lotes de tamanho máximo ``size``."""
        if size <= 0:
            return [items]
        return [items[i : i + size] for i in range(0, len(items), size)]

    @staticmethod
    def _extract_images(result: Any) -> list[str]:
        """Extrai URLs de imagens do resultado do Crawl4AI."""
        images: list[str] = []
        media = getattr(result, "media", {}) or {}
        for image in media.get("images", []):
            if isinstance(image, str):
                images.append(image)
            elif isinstance(image, dict):
                src = image.get("src") or image.get("url")
                if src:
                    images.append(src)
        return images

    @staticmethod
    def _detect_schema_type(schema: dict[str, Any]) -> str:
        """Detecta se o schema usa XPath ou CSS baseado nos seletores."""
        selectors = [schema.get("baseSelector", "")]
        for field in schema.get("fields", []):
            if "selector" in field:
                selectors.append(field["selector"])

        if any(
            isinstance(s, str) and (s.startswith("//") or s.startswith(".//"))
            for s in selectors
        ):
            return "XPATH"
        return "CSS"
