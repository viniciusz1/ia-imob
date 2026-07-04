from __future__ import annotations

import re
from typing import Any

from crawler_machine.config import FieldConfig


def extract_first_number(text: Any) -> float | None:
    """Extrai o primeiro número encontrado em uma string.

    Aceita separadores brasileiros e internacionais:
      - "72 ~ 79 m²"        -> 72.0
      - "3 (sendo 1 suíte)" -> 3.0
      - "1.234,56"          -> 1234.56
      - "1,234.56"          -> 1234.56
    """
    if text is None:
        return None

    text = str(text).strip()
    if not text:
        return None

    match = re.search(r"[\d.,]+", text)
    if not match:
        return None

    return parse_number(match.group(0))


def parse_number(raw: str) -> float | None:
    """Converte uma string numérica (com pontos/vírgulas) para float."""
    raw = raw.strip()
    if not raw:
        return None

    has_comma = "," in raw
    has_dot = "." in raw

    if has_comma and has_dot:
        last_comma = raw.rfind(",")
        last_dot = raw.rfind(".")
        if last_comma > last_dot:
            raw = raw.replace(".", "").replace(",", ".")
        else:
            raw = raw.replace(",", "")
    elif has_comma and not has_dot:
        if raw.count(",") > 1:
            raw = raw.replace(",", "")
        else:
            raw = raw.replace(",", ".")

    try:
        return float(raw)
    except ValueError:
        return None


def coerce_int(value: Any) -> int | None:
    """Extrai o primeiro número e retorna como int."""
    number = extract_first_number(value)
    if number is None:
        return None
    return int(number)


def coerce_float(value: Any) -> float | None:
    """Extrai o primeiro número e retorna como float."""
    return extract_first_number(value)


def coerce_currency(value: Any) -> float | None:
    """Extrai o primeiro valor monetário e retorna como float."""
    return extract_first_number(value)


def coerce_string(value: Any) -> str | None:
    """Garante que o valor seja uma string limpa."""
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None


def coerce_boolean(value: Any) -> bool | None:
    """Converte um valor para booleano."""
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


_COERCERS: dict[str, Any] = {
    "int": coerce_int,
    "float": coerce_float,
    "currency": coerce_currency,
    "string": coerce_string,
    "text": coerce_string,
    "boolean": coerce_boolean,
}


class DataNormalizer:
    """Normaliza registros extraídos de acordo com as coerções declaradas nos campos."""

    def normalize(
        self, record: dict[str, Any], fields: list[FieldConfig] | list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Aplica as coerções declaradas nos campos ao registro extraído.

        Args:
            record: Dicionário com valores brutos extraídos.
            fields: Lista de definições de campos, podendo conter a chave ``coerce``.

        Returns:
            Novo dicionário com os valores normalizados. Campos cujo valor não
            puder ser coagido são omitidos.
        """
        normalized: dict[str, Any] = {}

        for field in fields:
            name = field.get("name") if isinstance(field, dict) else field.name
            if name is None:
                continue

            if name not in record:
                continue

            coerce_type = field.get("coerce") if isinstance(field, dict) else field.coerce
            if coerce_type is None:
                normalized[name] = record[name]
                continue

            coercer = _COERCERS.get(coerce_type)
            if coercer is None:
                normalized[name] = record[name]
                continue

            normalized[name] = coercer(record[name])

        return normalized

    def normalize_many(
        self, records: list[dict[str, Any]], fields: list[FieldConfig] | list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """Normaliza uma lista de registros."""
        return [self.normalize(record, fields) for record in records]
