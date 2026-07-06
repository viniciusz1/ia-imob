from __future__ import annotations

from typing import Any

from src.catalog import CatalogRepository
from src.config import FieldConfig
from src.normalization.coercers import _COERCERS
from src.normalization.normalizers.area_normalizer import AreaNormalizer
from src.normalization.normalizers.city_normalizer import CityNormalizer
from src.normalization.normalizers.details_normalizer import DetailsNormalizer
from src.normalization.normalizers.image_normalizer import ImageNormalizer
from src.normalization.normalizers.integer_normalizer import IntegerNormalizer
from src.normalization.normalizers.neighborhood_normalizer import NeighborhoodNormalizer
from src.normalization.normalizers.property_type_normalizer import PropertyTypeNormalizer
from src.normalization.normalizers.url_normalizer import UrlNormalizer
from src.normalization.normalizers.value_normalizer import ValueNormalizer
from src.normalization.normalizers.year_normalizer import YearNormalizer
from src.normalization.protocol import FieldNormalizer
from src.normalization.result import NormalizationResult


class DataNormalizer:
    """Orquestra a normalização de registros usando normalizadores específicos por campo."""

    def __init__(
        self,
        catalog_repository: CatalogRepository | None = None,
        city_slug: str | None = None,
        field_normalizers: dict[str, FieldNormalizer] | None = None,
    ):
        self._catalog = catalog_repository
        self._city_slug = city_slug
        self._field_normalizers = field_normalizers or self._build_default_normalizers()

    def _build_default_normalizers(self) -> dict[str, FieldNormalizer]:
        normalizers: dict[str, FieldNormalizer] = {}
        if self._catalog is not None:
            normalizers["tipo_imovel"] = PropertyTypeNormalizer(self._catalog)
            normalizers["cidade"] = CityNormalizer(self._catalog)
            if self._city_slug is not None:
                normalizers["bairro"] = NeighborhoodNormalizer(self._catalog, self._city_slug)

        normalizers["valor"] = ValueNormalizer()
        normalizers["area_util"] = AreaNormalizer()
        normalizers["area_privada"] = AreaNormalizer()
        normalizers["quartos"] = IntegerNormalizer(max_value=50)
        normalizers["suites"] = IntegerNormalizer(max_value=50)
        normalizers["banheiros"] = IntegerNormalizer(max_value=50)
        normalizers["vagas"] = IntegerNormalizer(max_value=50)
        normalizers["sala"] = IntegerNormalizer(max_value=50)
        normalizers["ano"] = YearNormalizer()
        normalizers["url"] = UrlNormalizer()
        normalizers["imagem"] = ImageNormalizer()
        normalizers["detalhes"] = DetailsNormalizer()
        return normalizers

    def normalize(
        self,
        record: dict[str, Any],
        fields: list[FieldConfig] | list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Normaliza um único registro e anexa metadados de qualidade."""
        normalized: dict[str, Any] = {}
        warnings: list[str] = []

        for key, value in record.items():
            if key.startswith("_"):
                continue

            normalizer = self._field_normalizers.get(key)
            if normalizer is not None:
                result = normalizer.normalize(value, record)
            else:
                result = self._coerce_field(key, value, fields)

            if result.warnings:
                warnings.extend(result.warnings)

            if not result.omitted:
                normalized[key] = result.value

        normalized["_quality"] = {
            "valid": len(warnings) == 0,
            "warnings": warnings,
        }
        return normalized

    def normalize_many(
        self,
        records: list[dict[str, Any]],
        fields: list[FieldConfig] | list[dict[str, Any]] | None = None,
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Normaliza uma lista de registros e gera um relatório de qualidade global."""
        normalized_records = [self.normalize(record, fields) for record in records]

        records_with_issues = [
            index
            for index, record in enumerate(normalized_records)
            if not record["_quality"]["valid"]
        ]

        report = {
            "total_records": len(records),
            "records_with_issues": records_with_issues,
        }
        return normalized_records, report

    def _coerce_field(
        self,
        name: str,
        value: Any,
        fields: list[FieldConfig] | list[dict[str, Any]] | None,
    ) -> NormalizationResult:
        coerce_type = self._find_coerce_type(name, fields)
        if coerce_type is None:
            return NormalizationResult(value=value, is_valid=True)

        coercer = _COERCERS.get(coerce_type)
        if coercer is None:
            return NormalizationResult(value=value, is_valid=True)

        coerced = coercer(value)
        if coerced is None and value is not None:
            return NormalizationResult(
                value=None,
                is_valid=False,
                warnings=[f"não foi possível coagir {name} para {coerce_type}"],
                omitted=True,
            )
        return NormalizationResult(value=coerced, is_valid=True)

    def _find_coerce_type(
        self,
        name: str,
        fields: list[FieldConfig] | list[dict[str, Any]] | None,
    ) -> str | None:
        if fields is None:
            return None
        for field in fields:
            field_name = field.name if isinstance(field, FieldConfig) else field.get("name")
            if field_name == name:
                return field.coerce if isinstance(field, FieldConfig) else field.get("coerce")
        return None
