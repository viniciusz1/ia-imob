from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

import psycopg2
from psycopg2.extras import execute_values
from unidecode import unidecode

logger = logging.getLogger(__name__)


FIELD_RENAME_MAP: dict[str, str] = {
    "tipo_imovel": "tipo",
    "url": "link_imovel",
    "detalhes": "descricao",
    "area_util": "area",
    "ano": "ano_construcao",
}


def _rename_fields(record: dict[str, Any]) -> dict[str, Any]:
    """Mapeia nomes de campos do crawler para nomes de colunas do banco."""
    renamed: dict[str, Any] = {}
    for key, value in record.items():
        renamed[FIELD_RENAME_MAP.get(key, key)] = value
    return renamed


RAW_PROPERTY_COLUMNS = [
    "crawler_run_id",
    "source_url",
    "external_id",
    "tipo_imovel",
    "imagem",
    "quartos",
    "sala",
    "banheiros",
    "suites",
    "vagas",
    "ano",
    "valor",
    "area_privada",
    "area_util",
    "detalhes",
    "bairro",
    "cidade",
    "piscina",
    "churrasqueira",
    "academia",
    "salao_festas",
    "playground",
    "sacada",
    "mobiliado",
    "ar_condicionado",
    "lavanderia",
    "escritorio",
    "closet",
    "elevador",
    "portaria_24h",
    "aceita_permuta",
    "financiamento",
    "raw_payload",
]


MARKET_PROPERTY_COLUMNS = [
    "crawler_run_id",
    "raw_property_id",
    "source_url",
    "tipo",
    "imobiliaria",
    "valor",
    "bairro",
    "cidade",
    "imagem",
    "link_imovel",
    "descricao",
    "quartos",
    "suites",
    "banheiros",
    "vagas",
    "area",
    "aceita_permuta",
    "financiamento",
    "piscina",
    "churrasqueira",
    "academia",
    "salao_festas",
    "playground",
    "sacada",
    "mobiliado",
    "ar_condicionado",
    "lavanderia",
    "escritorio",
    "closet",
    "elevador",
    "portaria_24h",
    "andar",
    "posicao_solar",
    "ano_construcao",
    "quality_status",
    "quality_metadata",
]

BOOLEAN_FIELDS = {
    "aceita_permuta",
    "financiamento",
    "piscina",
    "churrasqueira",
    "academia",
    "salao_festas",
    "playground",
    "sacada",
    "mobiliado",
    "ar_condicionado",
    "lavanderia",
    "escritorio",
    "closet",
    "elevador",
    "portaria_24h",
}


def _to_boolean(value: Any) -> bool | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in {"true", "sim", "yes", "1", "s"}:
        return True
    if text in {"false", "não", "nao", "no", "0", "n"}:
        return False
    return None


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if text == "":
        return None
    cleaned = re.sub(r"[^\d,\.]", "", text)
    if cleaned == "":
        return None
    try:
        if "," in cleaned and "." in cleaned:
            last_comma = cleaned.rfind(",")
            last_dot = cleaned.rfind(".")
            if last_comma > last_dot:
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            if cleaned.count(",") > 1:
                cleaned = cleaned.replace(",", "")
            else:
                cleaned = cleaned.replace(",", ".")
        return float(cleaned)
    except ValueError:
        return None


def _to_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    text = str(value).strip()
    if text == "":
        return None
    match = re.search(r"\d+", text)
    if not match:
        return None
    return int(match.group(0))


def _coerce_for_column(value: Any, column: str) -> Any:
    if column in BOOLEAN_FIELDS:
        return _to_boolean(value)
    if column in {"valor", "area"}:
        return _to_float(value)
    if column in {"quartos", "suites", "banheiros", "vagas", "ano_construcao"}:
        return _to_int(value)
    if value is None:
        return None
    return str(value).strip() if str(value).strip() != "" else None


@dataclass(frozen=True)
class PostgresConfig:
    host: str
    port: int
    database: str
    user: str
    password: str

    @classmethod
    def from_env(cls) -> "PostgresConfig | None":
        host = os.environ.get("DB_HOST")
        port = os.environ.get("DB_PORT")
        database = os.environ.get("DB_DATABASE")
        user = os.environ.get("DB_USERNAME")
        password = os.environ.get("DB_PASSWORD")

        if not all([host, port, database, user, password]):
            return None

        return cls(
            host=host,
            port=int(port),
            database=database,
            user=user,
            password=password,
        )


class PostgresSink:
    """Persiste resultados de execuções do crawler no Postgres.

    Cada execução cria um registro em ``crawler_runs``. Apenas o run mais
    recente com status ``completed`` de uma determinada fonte fica marcado
    como ``latest``. Os dados brutos são salvos em ``crawler.raw_properties``
    e os dados normalizados em ``crawler.market_properties``, vinculados por
    ``raw_property_id``. A gravação é atômica: run + raw + normalized + latest.
    """

    def __init__(self, config: PostgresConfig):
        self._config = config

    def save_run(
        self,
        source_name: str,
        raw_properties: list[dict[str, Any]],
        normalized_properties: list[dict[str, Any]],
        errors: list[dict[str, Any]],
    ) -> int:
        """Salva uma execução completa e retorna o ID do run criado."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO crawler_runs
                            (source_name, status, started_at, completed_at, properties_count, latest)
                        VALUES (%s, %s, NOW(), NOW(), %s, TRUE)
                        RETURNING id
                        """,
                        (source_name, "completed", len(normalized_properties)),
                    )
                    run_id = cursor.fetchone()[0]

                    cursor.execute(
                        """
                        UPDATE crawler_runs
                        SET latest = FALSE
                        WHERE source_name = %s AND id != %s
                        """,
                        (source_name, run_id),
                    )

                    raw_ids: list[int] = []
                    if raw_properties:
                        raw_rows = self._build_raw_rows(run_id, raw_properties)
                        execute_values(
                            cursor,
                            f"""
                            INSERT INTO crawler.raw_properties (
                                {", ".join(RAW_PROPERTY_COLUMNS)}
                            ) VALUES %s
                            RETURNING id
                            """,
                            raw_rows,
                        )
                        raw_ids = [row[0] for row in cursor.fetchall()]

                    if normalized_properties:
                        market_rows = self._build_market_rows(
                            run_id, normalized_properties, raw_ids, source_name
                        )
                        execute_values(
                            cursor,
                            f"""
                            INSERT INTO crawler.market_properties (
                                {", ".join(MARKET_PROPERTY_COLUMNS)}
                            ) VALUES %s
                            """,
                            market_rows,
                        )

                    logger.info(
                        "Run %s salvo para %s com %s propriedades",
                        run_id,
                        source_name,
                        len(normalized_properties),
                    )
                    return run_id
        finally:
            connection.close()

    def start_run(self, source_name: str) -> int:
        """Cria um run inicial com status ``running`` e retorna o ID."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO crawler_runs
                            (source_name, status, started_at, latest)
                        VALUES (%s, %s, NOW(), FALSE)
                        RETURNING id
                        """,
                        (source_name, "running"),
                    )
                    return cursor.fetchone()[0]
        finally:
            connection.close()

    def fail_run(self, run_id: int, error_message: str) -> None:
        """Marca um run como falho."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE crawler_runs
                        SET status = %s, completed_at = NOW(), error_message = %s
                        WHERE id = %s
                        """,
                        ("failed", error_message, run_id),
                    )
        finally:
            connection.close()

    def save_discovery_run(self, source_name: str, urls: list[str]) -> int:
        """Salva um discovery run completo e retorna o ID."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO discovery_runs
                            (source_name, status, urls, started_at, completed_at, latest)
                        VALUES (%s, %s, %s, NOW(), NOW(), TRUE)
                        RETURNING id
                        """,
                        (source_name, "completed", json.dumps(urls)),
                    )
                    run_id = cursor.fetchone()[0]

                    cursor.execute(
                        """
                        UPDATE discovery_runs
                        SET latest = FALSE
                        WHERE source_name = %s AND id != %s
                        """,
                        (source_name, run_id),
                    )

                    logger.info(
                        "Discovery run %s salvo para %s com %s URLs",
                        run_id,
                        source_name,
                        len(urls),
                    )
                    return run_id
        finally:
            connection.close()

    def start_discovery_run(self, source_name: str) -> int:
        """Cria um discovery run inicial com status running e retorna o ID."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO discovery_runs
                            (source_name, status, started_at, latest)
                        VALUES (%s, %s, NOW(), FALSE)
                        RETURNING id
                        """,
                        (source_name, "running"),
                    )
                    return cursor.fetchone()[0]
        finally:
            connection.close()

    def fail_discovery_run(self, run_id: int, error_message: str) -> None:
        """Marca um discovery run como falho."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE discovery_runs
                        SET status = %s, completed_at = NOW(), error_message = %s
                        WHERE id = %s
                        """,
                        ("failed", error_message, run_id),
                    )
        finally:
            connection.close()

    def load_latest_discovery(self, source_name: str) -> list[str] | None:
        """Retorna as URLs do discovery run mais recente com status completed, ou None."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT urls FROM discovery_runs
                        WHERE source_name = %s AND status = %s AND latest = TRUE
                        LIMIT 1
                        """,
                        (source_name, "completed"),
                    )
                    row = cursor.fetchone()
                    if row is None or row[0] is None:
                        return None
                    return json.loads(row[0])
        finally:
            connection.close()

    def save_schema_run(
        self,
        source_name: str,
        schema_data: dict[str, Any],
        schema_type: str,
        sample_url: str,
        fields_snapshot: list[dict[str, Any]],
    ) -> int:
        """Salva um schema run completo e retorna o ID."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO schema_runs
                            (source_name, status, schema_data, schema_type, sample_url,
                             fields_snapshot, started_at, completed_at, latest)
                        VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW(), TRUE)
                        RETURNING id
                        """,
                        (
                            source_name,
                            "completed",
                            json.dumps(schema_data),
                            schema_type,
                            sample_url,
                            json.dumps(fields_snapshot),
                        ),
                    )
                    run_id = cursor.fetchone()[0]

                    cursor.execute(
                        """
                        UPDATE schema_runs
                        SET latest = FALSE
                        WHERE source_name = %s AND id != %s
                        """,
                        (source_name, run_id),
                    )

                    logger.info(
                        "Schema run %s salvo para %s (type=%s)",
                        run_id,
                        source_name,
                        schema_type,
                    )
                    return run_id
        finally:
            connection.close()

    def start_schema_run(self, source_name: str) -> int:
        """Cria um schema run inicial com status running e retorna o ID."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO schema_runs
                            (source_name, status, started_at, latest)
                        VALUES (%s, %s, NOW(), FALSE)
                        RETURNING id
                        """,
                        (source_name, "running"),
                    )
                    return cursor.fetchone()[0]
        finally:
            connection.close()

    def fail_schema_run(self, run_id: int, error_message: str) -> None:
        """Marca um schema run como falho."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE schema_runs
                        SET status = %s, completed_at = NOW(), error_message = %s
                        WHERE id = %s
                        """,
                        ("failed", error_message, run_id),
                    )
        finally:
            connection.close()

    def link_discovery_run(self, discovery_run_id: int, crawler_run_id: int) -> None:
        """Vincula um discovery run a um crawler run."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE discovery_runs SET crawler_run_id = %s WHERE id = %s",
                        (crawler_run_id, discovery_run_id),
                    )
        finally:
            connection.close()

    def link_schema_run(self, schema_run_id: int, crawler_run_id: int) -> None:
        """Vincula um schema run a um crawler run."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE schema_runs SET crawler_run_id = %s WHERE id = %s",
                        (crawler_run_id, schema_run_id),
                    )
        finally:
            connection.close()

    def load_latest_schema(self, source_name: str) -> dict[str, Any] | None:
        """Retorna o schema_data do schema run mais recente com status completed, ou None."""
        connection = psycopg2.connect(
            host=self._config.host,
            port=self._config.port,
            dbname=self._config.database,
            user=self._config.user,
            password=self._config.password,
        )
        try:
            with connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT schema_data FROM schema_runs
                        WHERE source_name = %s AND status = %s AND latest = TRUE
                        LIMIT 1
                        """,
                        (source_name, "completed"),
                    )
                    row = cursor.fetchone()
                    if row is None or row[0] is None:
                        return None
                    return json.loads(row[0])
        finally:
            connection.close()

    def _build_raw_rows(
        self,
        run_id: int,
        raw_properties: list[dict[str, Any]],
    ) -> list[tuple]:
        rows: list[tuple] = []
        for record in raw_properties:
            row: list[Any] = [run_id]
            payload = dict(record)
            for column in RAW_PROPERTY_COLUMNS[1:]:
                if column == "source_url":
                    row.append(record.get("url"))
                elif column == "external_id":
                    row.append(record.get("external_id"))
                elif column == "raw_payload":
                    row.append(json.dumps(payload))
                else:
                    value = record.get(column)
                    row.append(str(value) if value is not None else None)
            rows.append(tuple(row))
        return rows

    def _build_market_rows(
        self,
        run_id: int,
        normalized_properties: list[dict[str, Any]],
        raw_ids: list[int],
        source_name: str,
    ) -> list[tuple]:
        rows: list[tuple] = []
        for index, record in enumerate(normalized_properties):
            renamed = _rename_fields(record)
            quality = record.get("_quality", {})
            quality_status = "valid" if quality.get("valid", True) else "invalid"
            quality_metadata = quality

            row: list[Any] = [run_id]
            raw_property_id = raw_ids[index] if index < len(raw_ids) else None
            row.append(raw_property_id)
            row.append(record.get("url"))

            for column in MARKET_PROPERTY_COLUMNS[3:]:
                if column == "imobiliaria":
                    value = renamed.get("imobiliaria") or source_name
                elif column == "quality_status":
                    value = quality_status
                elif column == "quality_metadata":
                    value = json.dumps(quality_metadata)
                else:
                    value = renamed.get(column)
                row.append(_coerce_for_column(value, column))
            rows.append(tuple(row))
        return rows


def build_source_name(base_url: str, explicit_name: str | None = None) -> str:
    """Gera um slug de fonte a partir da URL base ou nome explícito."""
    name = explicit_name or base_url
    slug = re.sub(r"^https?://", "", name.lower())
    slug = unidecode(slug)
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug
