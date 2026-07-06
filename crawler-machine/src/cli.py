from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import typer
from dotenv import load_dotenv
from tqdm import tqdm

from src.config import ConfigLoader, DomainConfig
from src.crawler import ImovelCrawler
from src.discoverer import URLDiscoverer
from src.normalization.legacy import DataNormalizer
from src.output import OutputPath
from src.pipeline import Pipeline
from src.schema_generator import SchemaGenerator
from src.sink import PostgresConfig, PostgresSink

app = typer.Typer(help="Crawler de imobiliárias com discovery, schema IA e normalização.")


def _load_config(config_path: Path) -> DomainConfig:
    if not config_path.exists():
        raise typer.BadParameter(f"Arquivo de configuração não encontrado: {config_path}")
    return ConfigLoader.load(config_path)


def _load_env_file() -> None:
    env_path = Path(".env")
    if env_path.exists():
        load_dotenv(env_path)


def _check_api_key(config: DomainConfig) -> None:
    api_key = os.environ.get(config.llm.api_key_env)
    if not api_key:
        raise typer.BadParameter(
            f"Variável de ambiente {config.llm.api_key_env} não definida. "
            "Crie um arquivo .env na raiz do projeto."
        )


def _slugify_domain(domain: str) -> str:
    return domain.replace("https://", "").replace("http://", "").replace(".", "-")


def _make_output(base_dir: Path, domain: str) -> OutputPath:
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return OutputPath(base_dir=base_dir, domain=domain, timestamp=timestamp)


def _build_pipeline(
    config: DomainConfig,
    output: OutputPath,
    progress_bar: tqdm[Any] | None = None,
    verbose: bool = False,
    sink: PostgresSink | None = None,
    source_name: str | None = None,
) -> Pipeline:
    def _progress_callback(step: str, percent: int, message: str) -> None:
        logging.info(f"[{percent:3d}%] [{step}] {message}")
        if progress_bar is not None:
            progress_bar.set_description(f"{step}: {message}")
            progress_bar.n = percent
            progress_bar.refresh()

    def _crawler_factory(schema: dict[str, Any]) -> ImovelCrawler:
        return ImovelCrawler(config=config.crawler, fields=config.fields, schema=schema)

    return Pipeline(
        config=config,
        output=output,
        discoverer=URLDiscoverer(max_urls=config.discovery.max_urls),
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


def _load_sink() -> PostgresSink | None:
    config = PostgresConfig.from_env()
    if config is None:
        return None
    return PostgresSink(config)


@app.command()
def run(
    base_url: str = typer.Argument(..., help="URL base do site da imobiliária"),
    sample_url: str | None = typer.Option(
        None, "--sample-url", help="URL de exemplo para geração do schema (opcional se schema já cacheado no Postgres)"
    ),
    config_path: Path = typer.Option(
        Path("config/domain.json"), "--config", help="Caminho do arquivo de configuração"
    ),
    output_dir: Path = typer.Option(
        Path("output"), "--output", help="Diretório base de saída"
    ),
    source_name: str | None = typer.Option(
        None, "--source-name", help="Nome da fonte/imobiliária (slug usado no banco)"
    ),
    regenerate_discovery: bool = typer.Option(
        False, "--regenerate-discovery", help="Força nova descoberta de URLs, ignorando cache"
    ),
    regenerate_schema: bool = typer.Option(
        False, "--regenerate-schema", help="Força nova geração de schema via LLM, ignorando cache"
    ),
    verbose: bool = typer.Option(False, "--verbose", help="Logs detalhados"),
) -> None:
    """Executa o pipeline completo."""
    _setup_logging(verbose)
    _load_env_file()
    config = _load_config(config_path)
    _check_api_key(config)

    output = _make_output(output_dir, base_url)
    logging.info(f"Saída: {output.root}")

    sink = _load_sink()
    if sink is not None:
        logging.info("Postgres sink ativado")

    with tqdm(total=100, desc="pipeline", unit="%") as progress_bar:
        pipeline = _build_pipeline(
            config,
            output,
            progress_bar,
            verbose=verbose,
            sink=sink,
            source_name=source_name,
        )
        result = pipeline.run_sync(
            base_url,
            sample_url=sample_url,
            regenerate_discovery=regenerate_discovery,
            regenerate_schema=regenerate_schema,
        )

    logging.info(f"Pipeline concluído: {len(result.normalized)} registros normalizados")
    logging.info(f"Erros: {len(result.errors)}")
    if result.run_id is not None:
        logging.info(f"Run salvo no Postgres: {result.run_id}")
    logging.info(f"Artefatos salvos em: {output.root}")


@app.command()
def discover(
    base_url: str = typer.Argument(..., help="URL base do site da imobiliária"),
    config_path: Path = typer.Option(
        Path("config/domain.json"), "--config", help="Caminho do arquivo de configuração"
    ),
    output_dir: Path = typer.Option(
        Path("output"), "--output", help="Diretório base de saída"
    ),
    source_name: str | None = typer.Option(
        None, "--source-name", help="Nome da fonte/imobiliária (slug usado no banco)"
    ),
    save_to_db: bool = typer.Option(False, "--save-to-db", help="Persiste os resultados no Postgres"),
) -> None:
    """Descobre URLs do site."""
    _setup_logging()
    config = _load_config(config_path)
    output = _make_output(output_dir, base_url)

    discoverer = URLDiscoverer(max_urls=config.discovery.max_urls)
    urls = discoverer.discover_sync(base_url)

    output.discovered.parent.mkdir(parents=True, exist_ok=True)
    with output.discovered.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "metadata": {
                    "base_url": base_url,
                    "discovered_at": datetime.now(timezone.utc).isoformat(),
                    "count": len(urls),
                },
                "urls": urls,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    if save_to_db:
        sink = _load_sink()
        if sink is None:
            raise typer.BadParameter(
                "Postgres não configurado. Defina as variáveis DB_* para usar --save-to-db."
            )
        name = source_name or base_url
        sink.save_discovery_run(name, urls)
        typer.echo(f"URLs persistidas em discovery_runs para source_name={name}")

    typer.echo(f"{len(urls)} URLs descobertas. Salvas em: {output.discovered}")


def _detect_schema_type_from_data(schema_data: dict[str, Any]) -> str:
    """Detecta se o schema é XPATH ou CSS baseado nos seletores."""
    selectors = [schema_data.get("baseSelector", "")]
    for field in schema_data.get("fields", []):
        if "selector" in field:
            selectors.append(field["selector"])

    if any(
        isinstance(s, str) and (s.startswith("//") or s.startswith(".//"))
        for s in selectors
    ):
        return "XPATH"
    return "CSS"


@app.command()
def schema(
    sample_url: str = typer.Argument(..., help="URL de exemplo para gerar o schema"),
    config_path: Path = typer.Option(
        Path("config/domain.json"), "--config", help="Caminho do arquivo de configuração"
    ),
    output_dir: Path = typer.Option(
        Path("output"), "--output", help="Diretório base de saída"
    ),
    source_name: str | None = typer.Option(
        None, "--source-name", help="Nome da fonte/imobiliária (slug usado no banco, obrigatório com --save-to-db)"
    ),
    save_to_db: bool = typer.Option(False, "--save-to-db", help="Persiste o schema gerado no Postgres"),
    verbose: bool = typer.Option(False, "--verbose", help="Logs detalhados"),
) -> None:
    """Gera um schema de extração a partir de uma URL de exemplo."""
    if save_to_db and not source_name:
        raise typer.BadParameter("--source-name é obrigatório quando --save-to-db é usado.")

    _setup_logging(verbose)
    _load_env_file()
    config = _load_config(config_path)
    _check_api_key(config)

    output = _make_output(output_dir, sample_url)
    generator = SchemaGenerator(
        llm_config=config.llm, fields=config.fields, verbose=verbose
    )
    schema_data = generator.generate_sync(sample_url)

    output.schema.parent.mkdir(parents=True, exist_ok=True)
    with output.schema.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "metadata": {
                    "sample_url": sample_url,
                    "generated_at": datetime.now(timezone.utc).isoformat(),
                },
                "schema": schema_data,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    if save_to_db:
        sink = _load_sink()
        if sink is None:
            raise typer.BadParameter(
                "Postgres não configurado. Defina as variáveis DB_* para usar --save-to-db."
            )
        schema_type = _detect_schema_type_from_data(schema_data)
        fields_snapshot = [
            {"name": f.name, "description": f.description, "coerce": f.coerce}
            for f in config.fields
        ]
        sink.save_schema_run(source_name, schema_data, schema_type, sample_url, fields_snapshot)
        typer.echo(f"Schema persistido em schema_runs para source_name={source_name}")

    typer.echo(f"Schema gerado e salvo em: {output.schema}")


@app.command()
def crawl(
    schema_file: Path = typer.Argument(..., help="Arquivo JSON com o schema"),
    urls_file: Path = typer.Argument(..., help="Arquivo JSON com as URLs descobertas"),
    config_path: Path = typer.Option(
        Path("config/domain.json"), "--config", help="Caminho do arquivo de configuração"
    ),
    output_dir: Path = typer.Option(
        Path("output"), "--output", help="Diretório base de saída"
    ),
) -> None:
    """Executa o crawler usando um schema e uma lista de URLs."""
    _setup_logging()
    config = _load_config(config_path)

    with schema_file.open("r", encoding="utf-8") as f:
        schema_payload = json.load(f)

    schema_data = schema_payload.get("schema", schema_payload)

    with urls_file.open("r", encoding="utf-8") as f:
        urls_payload = json.load(f)

    urls = urls_payload.get("urls", urls_payload.get("data", []))

    output = _make_output(output_dir, urls[0] if urls else "unknown")
    crawler = ImovelCrawler(config=config.crawler, fields=config.fields, schema=schema_data)
    data, errors = crawler.crawl_sync(urls)

    output.raw.parent.mkdir(parents=True, exist_ok=True)
    with output.raw.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "metadata": {
                    "crawled_at": datetime.now(timezone.utc).isoformat(),
                    "count": len(data),
                    "error_count": len(errors),
                },
                "data": data,
                "errors": errors,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    typer.echo(f"{len(data)} registros extraídos | {len(errors)} erros")
    typer.echo(f"Resultado salvo em: {output.raw}")


@app.command()
def normalize(
    raw_file: Path = typer.Argument(..., help="Arquivo JSON com dados brutos"),
    config_path: Path = typer.Option(
        Path("config/domain.json"), "--config", help="Caminho do arquivo de configuração"
    ),
    output_dir: Path = typer.Option(
        Path("output"), "--output", help="Diretório base de saída"
    ),
) -> None:
    """Normaliza dados brutos extraídos."""
    _setup_logging()
    config = _load_config(config_path)

    with raw_file.open("r", encoding="utf-8") as f:
        raw_payload = json.load(f)

    raw_data = raw_payload.get("data", [])

    output = _make_output(output_dir, raw_file.stem)
    normalizer = DataNormalizer()
    normalized = normalizer.normalize_many(raw_data, config.fields)

    output.normalized.parent.mkdir(parents=True, exist_ok=True)
    with output.normalized.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "metadata": {
                    "normalized_at": datetime.now(timezone.utc).isoformat(),
                    "count": len(normalized),
                },
                "data": normalized,
            },
            f,
            indent=2,
            ensure_ascii=False,
        )

    typer.echo(f"{len(normalized)} registros normalizados")
    typer.echo(f"Resultado salvo em: {output.normalized}")


def _setup_logging(verbose: bool = False) -> None:
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
    )
