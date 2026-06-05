from __future__ import annotations

import re

from parsel import Selector

from app.compat import ensure_imobscrapy_imports
from app.schemas import ExtractorProposal, VerificationReport

ensure_imobscrapy_imports()
from imobiliarias.config.extractor import execute_selector  # noqa: E402


def _extract_value(extractor: ExtractorProposal, html: str) -> str | None:
    row = {
        "source_type": extractor.source_type,
        "selector_value": extractor.selector_value,
        "selector_index": extractor.selector_index,
        "selector_join": extractor.selector_join,
        "selector_params": None,
    }
    return execute_selector(row, Selector(text=html))


class SelectorVerifier:
    def verify(self, extractor: ExtractorProposal, htmls: list[str]) -> VerificationReport:
        filled = 0
        issues: list[str] = []
        sample_size = max(1, len(htmls))
        for index, html in enumerate(htmls):
            try:
                value = _extract_value(extractor, html)
            except Exception as exc:
                if len(issues) < 5:
                    issues.append(f"sample {index}: {type(exc).__name__}: {exc}")
                continue
            if value and _looks_plausible(extractor.field_name, str(value), extractor.output_type):
                filled += 1
            elif len(issues) < 5:
                issues.append(f"sample {index}: empty or implausible result")
        return VerificationReport(
            field_name=extractor.field_name,
            filled=filled,
            sample_size=sample_size,
            pass_rate=filled / sample_size,
            sample_issues=issues,
        )


def _looks_plausible(field_name: str, value: str, output_type: str) -> bool:
    text = re.sub(r"\s+", " ", value).strip()
    if not text:
        return False
    if output_type == "boolean":
        return True
    if field_name == "valor" or output_type == "number":
        return bool(re.search(r"\d", text))
    if field_name in {"quartos", "suites", "banheiros", "vagas", "area", "andar", "ano_construcao"}:
        return bool(re.search(r"\d", text))
    if field_name in {"link_imovel", "imagem"} or output_type in {"link_url", "image_url"}:
        return text.startswith(("http://", "https://", "//", "/")) or bool(
            re.search(r"\.(jpg|jpeg|png|webp|gif)(\?|$)", text, re.IGNORECASE)
        )
    if field_name in {"tipo", "bairro", "cidade", "posicao_solar"}:
        return bool(re.search(r"[A-Za-z]", text)) and len(text) <= 160
    if field_name == "descricao":
        return bool(re.search(r"[A-Za-z]", text)) and len(text) >= 8
    return True

