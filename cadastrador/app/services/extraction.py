from __future__ import annotations

from collections.abc import Sequence

from parsel import Selector

from app.compat import ensure_imobscrapy_imports
from app.schemas import ExtractorProposal

ensure_imobscrapy_imports()
from imobiliarias.config.dsl import PipelineRunner  # noqa: E402
from imobiliarias.config.extractor import execute_field_extraction  # noqa: E402
from imobiliarias.config.field_catalog import loader_output_type  # noqa: E402
from imobiliarias.config.processors import apply_output_type  # noqa: E402


_PIPELINE_RUNNER = PipelineRunner()


def extract_value(extractor: ExtractorProposal, html: str) -> str | None:
    return extract_field_value([extractor], html)


def loader_treatment(
    field_name: str,
    output_type: str | None,
    raw_value: str | None,
) -> str | None:
    """Replicate the Scrapy ImovelItemLoader's final treatment for a field.

    The inspection bench only runs the selector + DSL pipeline; the real spider
    then runs the value through ``ImovelItemLoader`` processors keyed by
    output_type. This applies the same chain so the bench can show the value
    that would actually be stored (e.g. "Apartamento para alugar" ->
    "Apartamento"). Returns the value as a string for display, or None when the
    chain drops it.
    """
    if raw_value is None:
        return None
    treated = apply_output_type(loader_output_type(field_name, output_type), raw_value)
    return None if treated is None else str(treated)


def extract_field_value(
    extractors: Sequence[ExtractorProposal],
    html: str,
) -> str | None:
    rows = [_extractor_row(extractor) for extractor in extractors]
    return execute_field_extraction(rows, Selector(text=html), _PIPELINE_RUNNER)


def _extractor_row(extractor: ExtractorProposal) -> dict[str, object]:
    return {
        "field_name": extractor.field_name,
        "source_type": extractor.source_type,
        "selector_value": _selector_value(extractor),
        "selector_index": extractor.selector_index,
        "selector_join": extractor.selector_join,
        "selector_params": None,
        "pipeline": extractor.pipeline,
        "priority": extractor.priority,
    }


def _selector_value(extractor: ExtractorProposal) -> str:
    if extractor.source_type == "og" and extractor.selector_value.lower().startswith("og:"):
        return extractor.selector_value.split(":", 1)[1]
    return extractor.selector_value
