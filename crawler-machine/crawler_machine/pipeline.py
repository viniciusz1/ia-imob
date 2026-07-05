from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, Protocol

import psycopg2

from crawler_machine.catalog import CatalogRepository
from crawler_machine.config import DomainConfig
from crawler_machine.data_normalizer import DataNormalizer
from crawler_machine.output import OutputPath
from crawler_machine.schema import ensure_schema
from crawler_machine.sink import PostgresConfig, PostgresSink, build_source_name

logger = logging.getLogger(__name__)


class Discoverer(Protocol):
    async def discover(self, base_url: str) -> list[str]: ...


class SchemaGenerator(Protocol):
    async def generate(self, sample_url: str) -> dict[str, Any]: ...


class Crawler(Protocol):
    async def crawl(self, urls: list[str]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]: ...


CrawlerFactory = Callable[[dict[str, Any]], Crawler]


ProgressCallback = Callable[[str, int, str], None]


@dataclass(frozen=True)
class PipelineResult:
    normalized: list[dict[str, Any]]
    errors: list[dict[str, Any]]
    output: OutputPath
    run_id: int | None = None


class Pipeline:
    """Orquestra as quatro etapas do sistema."""

    def __init__(
        self,
        config: DomainConfig | dict[str, Any],
        output: OutputPath,
        discoverer: Discoverer,
        schema_generator: SchemaGenerator,
        crawler_factory: CrawlerFactory,
        progress_callback: ProgressCallback | None = None,
        sink: PostgresSink | None = None,
        source_name: str | None = None,
    ):
        self._config = config
        self._output = output
        self._discoverer = discoverer
        self._schema_generator = schema_generator
        self._crawler_factory = crawler_factory
        self._progress_callback = progress_callback
        self._sink = sink
        self._source_name = source_name

    async def run(
        self,
        base_url: str,
        sample_url: str | None = None,
        regenerate_discovery: bool = False,
        regenerate_schema: bool = False,
    ) -> PipelineResult:
        """Executa o pipeline completo.

        Quando um sink Postgres está configurado, reusa resultados de discovery
        e schema de execuções anteriores por padrão. Use ``regenerate_discovery``
        ou ``regenerate_schema`` para forçar nova geração.
        """
        source_name = self._source_name or build_source_name(base_url)
        sink_run_id: int | None = None
        discovery_run_id: int | None = None
        schema_run_id: int | None = None

        if self._sink is not None:
            sink_run_id = await asyncio.to_thread(self._sink.start_run, source_name)

        try:
            # --- Discovery ---
            urls: list[str] = []
            if self._sink is not None and not regenerate_discovery:
                cached_urls = await asyncio.to_thread(
                    self._sink.load_latest_discovery, source_name
                )
                if cached_urls is not None:
                    urls = cached_urls
                    self._report("discovery", 25, f"{len(urls)} URLs reutilizadas do cache")

            if not urls:
                self._report("discovery", 0, "Iniciando descoberta de URLs...")
                urls = await self._discoverer.discover(base_url)
                self._report("discovery", 25, f"{len(urls)} URLs descobertas")

                if self._sink is not None:
                    discovery_run_id = await asyncio.to_thread(
                        self._sink.save_discovery_run, source_name, urls
                    )

            self._save_json(
                self._output.discovered,
                {
                    "metadata": {
                        "base_url": base_url,
                        "discovered_at": _now_iso(),
                        "count": len(urls),
                    },
                    "urls": urls,
                },
            )

            if not urls:
                self._report("pipeline", 100, "Nenhuma URL encontrada. Finalizando.")
                if self._sink is not None and sink_run_id is not None:
                    await asyncio.to_thread(
                        self._sink.save_run, source_name, [], [], []
                    )
                return PipelineResult(normalized=[], errors=[], output=self._output, run_id=sink_run_id)

            # --- Schema ---
            schema: dict[str, Any] = {}
            if self._sink is not None and not regenerate_schema:
                cached_schema = await asyncio.to_thread(
                    self._sink.load_latest_schema, source_name
                )
                if cached_schema is not None:
                    schema = cached_schema
                    self._report("schema", 50, "Schema reutilizado do cache")

            if not schema:
                if sample_url is None:
                    if self._sink is not None:
                        raise ValueError(
                            "sample_url é obrigatório quando não há schema cacheado. "
                            "Passe --sample-url ou execute com --regenerate-schema."
                        )
                    raise ValueError(
                        "sample_url é obrigatório quando Postgres não está configurado "
                        "(sem cache de schema disponível). Configure as variáveis DB_* "
                        "ou passe --sample-url."
                    )

                self._report("schema", 25, f"Gerando schema a partir de {sample_url}...")
                schema = await self._schema_generator.generate(sample_url)
                self._report("schema", 50, "Schema gerado")

                if self._sink is not None:
                    schema_type = _detect_schema_type(schema)
                    schema_run_id = await asyncio.to_thread(
                        self._sink.save_schema_run,
                        source_name,
                        schema,
                        schema_type,
                        sample_url,
                        [],
                    )

            self._save_json(
                self._output.schema,
                {
                    "metadata": {
                        "sample_url": sample_url or "",
                        "generated_at": _now_iso(),
                    },
                    "schema": schema,
                },
            )

            self._report("crawl", 50, f"Iniciando crawling de {len(urls)} URLs...")
            crawler = self._crawler_factory(schema)
            raw_data, errors = await crawler.crawl(urls)
            self._report("crawl", 75, f"{len(raw_data)} registros extraídos | {len(errors)} erros")

            self._report("normalize", 75, "Normalizando dados...")
            normalizer = self._build_normalizer(source_name)
            normalized, quality_report = normalizer.normalize_many(raw_data)

            self._save_json(
                self._output.raw,
                {
                    "metadata": {
                        "crawled_at": _now_iso(),
                        "count": len(raw_data),
                        "error_count": len(errors),
                    },
                    "data": raw_data,
                    "errors": errors,
                },
            )
            self._save_json(
                self._output.normalized,
                {
                    "metadata": {
                        "normalized_at": _now_iso(),
                        "count": len(normalized),
                    },
                    "data": normalized,
                },
            )
            self._save_json(
                self._output.quality_report,
                {
                    "metadata": {
                        "generated_at": _now_iso(),
                    },
                    **quality_report,
                },
            )
            self._save_json(
                self._output.errors,
                {
                    "metadata": {
                        "count": len(errors),
                    },
                    "errors": errors,
                },
            )
            self._report("normalize", 100, "Dados normalizados")

            if self._sink is not None:
                sink_run_id = await asyncio.to_thread(
                    self._sink.save_run, source_name, raw_data, normalized, errors
                )
                self._report("sink", 100, f"Dados persistidos no Postgres (run {sink_run_id})")

                # Link discovery e schema runs ao crawler run
                if discovery_run_id is not None and sink_run_id is not None:
                    await asyncio.to_thread(
                        self._sink.link_discovery_run, discovery_run_id, sink_run_id
                    )
                if schema_run_id is not None and sink_run_id is not None:
                    await asyncio.to_thread(
                        self._sink.link_schema_run, schema_run_id, sink_run_id
                    )

            self._report("pipeline", 100, "Pipeline concluído")

            return PipelineResult(normalized=normalized, errors=errors, output=self._output, run_id=sink_run_id)
        except Exception as exc:
            if self._sink is not None and sink_run_id is not None:
                await asyncio.to_thread(self._sink.fail_run, sink_run_id, str(exc))
            raise

    def run_sync(self, base_url: str, sample_url: str | None = None,
                 regenerate_discovery: bool = False,
                 regenerate_schema: bool = False) -> PipelineResult:
        """Versão síncrona de ``run``."""
        return asyncio.run(self.run(
            base_url,
            sample_url=sample_url,
            regenerate_discovery=regenerate_discovery,
            regenerate_schema=regenerate_schema,
        ))

    def _build_normalizer(self, source_name: str) -> DataNormalizer:
        catalog_repository: CatalogRepository | None = None
        if self._sink is not None and isinstance(self._sink._config, PostgresConfig):
            connection = psycopg2.connect(
                host=self._sink._config.host,
                port=self._sink._config.port,
                dbname=self._sink._config.database,
                user=self._sink._config.user,
                password=self._sink._config.password,
            )
            try:
                ensure_schema(connection)
                catalog_repository = CatalogRepository.from_postgres(connection)
            finally:
                connection.close()
        return DataNormalizer(catalog_repository=catalog_repository)

    def _report(self, step: str, percent: int, message: str) -> None:
        if self._progress_callback is not None:
            self._progress_callback(step, percent, message)

    @staticmethod
    def _save_json(path: Path, payload: dict[str, Any]) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)


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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
