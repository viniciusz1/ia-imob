from __future__ import annotations

import asyncio
from typing import Any, Protocol

from crawl4ai import DomainMapper


class URLMapper(Protocol):
    """Porta para descoberta de URLs."""

    async def scan(self, url: str) -> list[dict[str, Any]]: ...


class URLDiscoverer:
    """Descobre URLs a partir de uma URL base."""

    def __init__(self, mapper: URLMapper | None = None, max_urls: int = 500):
        self._mapper = mapper
        self.max_urls = max_urls

    async def discover(self, base_url: str) -> list[str]:
        """Descobre URLs a partir da URL base."""
        mapper = self._mapper
        if mapper is None:
            async with DomainMapper() as domain_mapper:
                results = await domain_mapper.scan(base_url)
        else:
            results = await mapper.scan(base_url)

        urls: list[str] = []
        for item in results[: self.max_urls]:
            if not isinstance(item, dict):
                continue
            url = item.get("url")
            if isinstance(url, str) and url:
                urls.append(url)

        return urls

    def discover_sync(self, base_url: str) -> list[str]:
        """Versão síncrona de ``discover``."""
        return asyncio.run(self.discover(base_url))
