from __future__ import annotations

from typing import Any

from src.config import FieldConfig
from src.normalization.coercers import _COERCERS


class DataNormalizer:
    """Normaliza registros extraídos de acordo com as coerções declaradas nos campos.

    .. note::
        Este normalizador é mantido por compatibilidade. O fluxo principal do
        pipeline usa :class:`src.normalization.engine.DataNormalizer`, que trabalha
        com implementações de :class:`src.normalization.protocol.FieldNormalizer`.
    """

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
