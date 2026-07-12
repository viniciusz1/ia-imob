from __future__ import annotations

from pathlib import Path
from typing import Any

from tqdm import tqdm

from crawler_machine.batch import build_default_runner
from crawler_machine.config import DomainConfig
from crawler_machine.discoverer import URLDiscoverer
from crawler_machine.extraction.engine import CrawlEngine
from crawler_machine.extraction.factory import build_crawl_engine
from crawler_machine.output import OutputPath
from crawler_machine.pipeline import Pipeline
from crawler_machine.schema_generator import SchemaGenerator
from crawler_machine.sink import PostgresSink


def build_pipeline(
    config: DomainConfig,
    output: OutputPath,
    progress_bar: tqdm[Any] | None = None,
    verbose: bool = False,
    sink: PostgresSink | None = None,
    source_name: str | None = None,
    enable_llm_fallback: bool | None = None,
) -> Pipeline:
    def _progress_callback(step: str, percent: int, message: str) -> None:
        import logging

        logging.info(f"[{percent:3d}%] [{step}] {message}")
        if progress_bar is not None:
            progress_bar.set_description(f"{step}: {message}")
            progress_bar.n = percent
            progress_bar.refresh()

    def _crawler_factory(schema: dict[str, Any]) -> CrawlEngine:
        return build_crawl_engine(
            config=config,
            schema=schema,
            enable_llm_fallback=enable_llm_fallback,
        )

    return Pipeline(
        config=config,
        output=output,
        discoverer=URLDiscoverer(
            max_urls=config.discovery.max_urls,
            listing_patterns=config.discovery.listing_patterns,
        ),
        schema_generator=SchemaGenerator(
            llm_config=config.llm,
            fields=config.fields,
            verbose=verbose,
        ),
        crawler_factory=_crawler_factory,
        progress_callback=_progress_callback,
        sink=sink,
        source_name=source_name,
    )


def build_batch_runner(
    config: DomainConfig,
    output_dir: Path,
    verbose: bool = False,
    sink: PostgresSink | None = None,
) -> Any:
    return build_default_runner(
        config=config,
        output_dir=output_dir,
        verbose=verbose,
        sink=sink,
    )
