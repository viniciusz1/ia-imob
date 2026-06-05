from __future__ import annotations

import re
from collections.abc import Sequence

from app.schemas import ExtractorProposal, VerificationReport
from app.services.extraction import extract_field_value


class SelectorVerifier:
    def verify(self, extractor: ExtractorProposal, htmls: list[str]) -> VerificationReport:
        return self.verify_chain(extractor.field_name, [extractor], htmls)

    def verify_chain(
        self,
        field_name: str,
        extractors: Sequence[ExtractorProposal],
        htmls: list[str],
    ) -> VerificationReport:
        filled = 0
        issues: list[str] = []
        sample_size = max(1, len(htmls))
        output_type = _output_type(extractors)
        for index, html in enumerate(htmls):
            try:
                value = extract_field_value(extractors, html)
            except Exception as exc:
                if len(issues) < 5:
                    issues.append(f"sample {index}: {type(exc).__name__}: {exc}")
                continue
            if value and _looks_plausible(field_name, str(value), output_type):
                filled += 1
            elif len(issues) < 5:
                issues.append(f"sample {index}: empty or implausible result")
        return VerificationReport(
            field_name=field_name,
            filled=filled,
            sample_size=sample_size,
            pass_rate=filled / sample_size,
            sample_issues=issues,
        )


def _output_type(extractors: Sequence[ExtractorProposal]) -> str:
    if not extractors:
        return "text"
    return sorted(extractors, key=lambda extractor: extractor.priority)[0].output_type


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
