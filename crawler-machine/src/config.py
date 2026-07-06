from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class LLMConfig:
    provider: str
    base_url: str
    api_key_env: str


@dataclass(frozen=True)
class CrawlerConfig:
    page_timeout: int
    max_concurrent: int
    chunk_size: int
    chunk_delay: float
    headless: bool


@dataclass(frozen=True)
class DiscoveryConfig:
    max_urls: int


@dataclass(frozen=True)
class FieldConfig:
    name: str
    description: str
    coerce: str | None = None


@dataclass(frozen=True)
class DomainConfig:
    llm: LLMConfig
    crawler: CrawlerConfig
    discovery: DiscoveryConfig
    fields: list[FieldConfig]


class ConfigLoader:
    """Carrega a configuração global do domínio a partir de um arquivo JSON."""

    @staticmethod
    def load(path: Path) -> DomainConfig:
        with path.open("r", encoding="utf-8") as f:
            data: dict[str, Any] = json.load(f)

        return DomainConfig(
            llm=LLMConfig(
                provider=data["llm"]["provider"],
                base_url=data["llm"]["base_url"],
                api_key_env=data["llm"]["api_key_env"],
            ),
            crawler=CrawlerConfig(
                page_timeout=data["crawler"]["page_timeout"],
                max_concurrent=data["crawler"]["max_concurrent"],
                chunk_size=data["crawler"]["chunk_size"],
                chunk_delay=data["crawler"]["chunk_delay"],
                headless=data["crawler"]["headless"],
            ),
            discovery=DiscoveryConfig(max_urls=data["discovery"]["max_urls"]),
            fields=[
                FieldConfig(
                    name=field["name"],
                    description=field["description"],
                    coerce=field.get("coerce"),
                )
                for field in data["fields"]
            ],
        )
