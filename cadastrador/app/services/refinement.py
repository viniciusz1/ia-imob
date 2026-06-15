from __future__ import annotations

import json
import re
from typing import Any, TypedDict

from parsel import Selector

from app.compat import ensure_imobscrapy_imports
from app.schemas import ExtractorProposal, RefinementEvidence, RefinementPreviewRequest

ensure_imobscrapy_imports()
from imobiliarias.config.dsl import PipelineRunner  # noqa: E402


_PIPELINE_RUNNER = PipelineRunner()


class SelectedEvidence(TypedDict, total=False):
    kind: str
    source_type: str
    selector_value: str
    matches_count: int
    selected_indexes: list[int]
    fragments: list[str]
    json_path: str
    script_index: int


def preview_refinement(payload: RefinementPreviewRequest) -> list[dict[str, Any]]:
    extractors = sorted(
        (
            extractor
            for extractor in payload.extractors
            if extractor.field_name == payload.field_name
        ),
        key=lambda extractor: extractor.priority,
    )
    return [_preview_evidence(payload.field_name, extractors, evidence) for evidence in payload.evidence]


def _preview_evidence(
    field_name: str,
    extractors: list[ExtractorProposal],
    evidence: RefinementEvidence,
) -> dict[str, Any]:
    try:
        selector = Selector(text=evidence.html)
        for index, extractor in enumerate(extractors):
            raw, selected = _resolve_extractor(extractor, selector)
            if raw and extractor.pipeline:
                raw = _PIPELINE_RUNNER.execute(extractor.pipeline, raw)
            if raw:
                if _should_try_next_extractor(field_name, raw, extractors[index + 1 :]):
                    continue
                return _result(
                    evidence=evidence,
                    status="extraiu valor",
                    value=raw,
                    used_priority=extractor.priority,
                    selected_evidence=selected,
                )
    except Exception as exc:
        return _result(
            evidence=evidence,
            status="erro",
            value=None,
            used_priority=None,
            selected_evidence=None,
            error=str(exc),
        )

    return _result(
        evidence=evidence,
        status="sem valor",
        value=None,
        used_priority=None,
        selected_evidence=None,
    )


def _resolve_extractor(
    extractor: ExtractorProposal,
    selector: Selector,
) -> tuple[str | None, SelectedEvidence]:
    source_type = extractor.source_type
    if source_type in {"css", "xpath"}:
        return _resolve_dom_selector(extractor, selector)
    if source_type == "og":
        return _resolve_og(extractor, selector)
    if source_type == "jsonld":
        return _resolve_jsonld(extractor, selector)
    if source_type == "literal":
        return extractor.selector_value, {
            "kind": "literal",
            "source_type": "literal",
            "selector_value": extractor.selector_value,
            "matches_count": 0,
            "selected_indexes": [],
            "fragments": [],
        }
    return None, {
        "kind": source_type,
        "source_type": source_type,
        "selector_value": extractor.selector_value,
        "matches_count": 0,
        "selected_indexes": [],
        "fragments": [],
    }


def _resolve_dom_selector(
    extractor: ExtractorProposal,
    selector: Selector,
) -> tuple[str | None, SelectedEvidence]:
    selection = (
        selector.css(extractor.selector_value)
        if extractor.source_type == "css"
        else selector.xpath(extractor.selector_value)
    )
    matches = selection.getall()
    selected_indexes: list[int] = []
    selected_fragments: list[str] = []
    raw: str | None = None

    if extractor.selector_join:
        selected_indexes = [index for index, item in enumerate(matches) if item and item.strip()]
        selected_fragments = [matches[index] for index in selected_indexes]
        raw = " ".join(item.strip() for item in selected_fragments)
    elif extractor.selector_index is not None:
        index = extractor.selector_index
        if 0 <= index < len(matches):
            selected_indexes = [index]
            selected_fragments = [matches[index]]
            raw = matches[index]
    elif matches:
        selected_indexes = [0]
        selected_fragments = [matches[0]]
        raw = matches[0]

    return raw, {
        "kind": "selector",
        "source_type": extractor.source_type,
        "selector_value": extractor.selector_value,
        "matches_count": len(matches),
        "selected_indexes": selected_indexes,
        "fragments": selected_fragments,
    }


def _resolve_og(
    extractor: ExtractorProposal,
    selector: Selector,
) -> tuple[str | None, SelectedEvidence]:
    property_name = _og_property_name(extractor.selector_value)
    meta_selector = f'//meta[@property="og:{property_name}"]'
    meta = selector.xpath(meta_selector)
    fragments = meta.getall()
    value = meta.xpath("@content").get()
    return value, {
        "kind": "og",
        "source_type": "og",
        "selector_value": extractor.selector_value,
        "matches_count": len(fragments),
        "selected_indexes": [0] if value else [],
        "fragments": fragments[:1] if value else [],
    }


def _resolve_jsonld(
    extractor: ExtractorProposal,
    selector: Selector,
) -> tuple[str | None, SelectedEvidence]:
    scripts = selector.xpath('//script[@type="application/ld+json"]')
    script_texts = scripts.xpath("text()").getall()
    script_fragments = scripts.getall()
    for index, script in enumerate(script_texts):
        try:
            data = json.loads(script)
            value = _follow_json_path(data, extractor.selector_value)
        except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError):
            continue
        if value is not None:
            return str(value), {
                "kind": "jsonld",
                "source_type": "jsonld",
                "selector_value": extractor.selector_value,
                "json_path": extractor.selector_value,
                "matches_count": len(script_texts),
                "selected_indexes": [index],
                "fragments": script_fragments[index : index + 1],
                "script_index": index,
            }
    return None, {
        "kind": "jsonld",
        "source_type": "jsonld",
        "selector_value": extractor.selector_value,
        "json_path": extractor.selector_value,
        "matches_count": len(script_texts),
        "selected_indexes": [],
        "fragments": [],
    }


def _follow_json_path(data: Any, selector_value: str) -> Any:
    cursor = data
    for key in selector_value.split("."):
        if isinstance(cursor, dict):
            cursor = _dict_get_casefold(cursor, key)
        elif isinstance(cursor, list):
            if not cursor:
                return None
            try:
                cursor = cursor[int(key)]
            except ValueError:
                cursor = cursor[0]
                if isinstance(cursor, dict):
                    cursor = _dict_get_casefold(cursor, key)
                else:
                    return None
        else:
            return None
        if cursor is None:
            return None
    return cursor


def _dict_get_casefold(data: dict[Any, Any], key: str) -> Any:
    if key in data:
        return data[key]
    wanted = key.casefold()
    for existing_key, value in data.items():
        if str(existing_key).casefold() == wanted:
            return value
    return None


def _og_property_name(selector_value: str) -> str:
    if selector_value.lower().startswith("og:"):
        return selector_value.split(":", 1)[1]
    return selector_value


def _should_try_next_extractor(
    field_name: str,
    raw: str,
    remaining_extractors: list[ExtractorProposal],
) -> bool:
    if field_name != "area":
        return False
    if not any(extractor.field_name == "area" for extractor in remaining_extractors):
        return False
    return _is_zero_like_number(raw)


def _is_zero_like_number(value: str) -> bool:
    text = re.sub(r"<[^>]+>", " ", str(value))
    match = re.search(r"\d[\d.,]*", text)
    if not match:
        return False
    number = match.group(0).replace(".", "").replace(",", ".")
    try:
        return float(number) == 0.0
    except ValueError:
        return False


def _result(
    *,
    evidence: RefinementEvidence,
    status: str,
    value: str | None,
    used_priority: int | None,
    selected_evidence: SelectedEvidence | None,
    error: str | None = None,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "evidence_id": evidence.id,
        "sample_index": evidence.sample_index,
        "url": evidence.url,
        "status": status,
        "value": value,
        "used_priority": used_priority,
        "selected_evidence": selected_evidence,
    }
    if error:
        result["error"] = error
    return result
