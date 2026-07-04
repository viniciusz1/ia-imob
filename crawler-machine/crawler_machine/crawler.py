from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig
from crawl4ai.extraction_strategy import JsonCssExtractionStrategy, JsonXPathExtractionStrategy

from crawler_machine.config import CrawlerConfig, FieldConfig
from crawler_machine.normalizer import DataNormalizer


@dataclass(frozen=True)
class CrawlResult:
    url: str
    success: bool
    data: list[dict[str, Any]]
    error: str | None = None
    images: list[str] = None

    def __post_init__(self):
        if self.images is None:
            object.__setattr__(self, "images", [])


CrawlerRunner = Callable[[str], Awaitable[CrawlResult]]


class ImovelCrawler:
    """Executa a extração estruturada em uma lista de URLs."""

    def __init__(
        self,
        config: CrawlerConfig,
        fields: list[FieldConfig],
        schema: dict[str, Any] | None = None,
        crawler_runner: CrawlerRunner | None = None,
    ):
        self._config = config
        self._fields = fields
        self._schema = schema or {}
        self._normalizer = DataNormalizer()
        self._crawler_runner = crawler_runner or self._default_runner

    async def crawl(self, urls: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        """Crawlea as URLs e retorna (dados normalizados, erros)."""
        semaphore = asyncio.Semaphore(self._config.max_concurrent)

        async def _crawl_one(url: str) -> tuple[list[dict[str, Any]] | None, dict[str, Any] | None]:
            async with semaphore:
                result = await self._crawler_runner(url)
                if not result.success:
                    return None, {"url": result.url, "error": result.error or "unknown error"}

                enriched = self._enrich_records(result)
                normalized = self._normalizer.normalize_many(enriched, self._fields)
                return normalized, None

        tasks = [_crawl_one(url) for url in urls]
        all_results = await asyncio.gather(*tasks)

        data: list[dict[str, Any]] = []
        errors: list[dict[str, Any]] = []

        for items, error in all_results:
            if error is not None:
                errors.append(error)
            elif items is not None:
                data.extend(items)

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

    async def _default_runner(self, url: str) -> CrawlResult:
        """Crawlear uma URL usando Crawl4AI."""
        schema_type = self._detect_schema_type(self._schema)
        if schema_type == "XPATH":
            extraction_strategy = JsonXPathExtractionStrategy(schema=self._schema)
        else:
            extraction_strategy = JsonCssExtractionStrategy(schema=self._schema)

        browser_config = BrowserConfig(headless=self._config.headless)
        crawler_config = CrawlerRunConfig(
            extraction_strategy=extraction_strategy,
            wait_for="css:body",
            page_timeout=self._config.page_timeout,
            remove_overlay_elements=True,
        )

        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=url, config=crawler_config)

        if not result.success:
            return CrawlResult(url=url, success=False, data=[], error=result.error_message)

        try:
            data = json.loads(result.extracted_content)
        except (json.JSONDecodeError, TypeError):
            data = []

        if isinstance(data, dict):
            data = data.get(self._schema.get("name", "items"), [])

        images = self._extract_images(result)
        return CrawlResult(
            url=url,
            success=True,
            data=data if isinstance(data, list) else [],
            images=images,
        )

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
