from __future__ import annotations

import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass

from app.schemas import ExtractorProposal
from app.services.anchors import anchor_values
from app.services.extraction import extract_field_value, loader_treatment

from imobiliarias.config.field_catalog import (  # noqa: E402
    MANDATORY_EXTRACTOR_FIELDS,
    synthesis_output_type,
)

ACERTIVIDADE_THRESHOLD = 0.8

CANDIDATE_STRATEGIES = ("dom", "structured", "text")
ANCHOR_WEIGHT = 2
_SOURCE_RANK = {"og": 0, "jsonld": 0, "xpath": 1, "css": 1, "literal": 2}


def _source_rank(extractor: "ExtractorProposal") -> int:
    return _SOURCE_RANK.get(extractor.source_type, 1)


def _anchor_set(field_name: str, html: str, url: str | None) -> set[str]:
    treated = {
        _normalize(loader_treatment(field_name, synthesis_output_type(field_name), raw))
        for raw in anchor_values(field_name, html, url=url)
    }
    return {value for value in treated if value is not None}


def select_extractors(
    candidates_by_field: dict[str, list[ExtractorProposal]],
    htmls,
    *,
    verifier,
    threshold: float,
    tournament: "ExtractorTournament | None" = None,
    urls=None,
    acertividade_threshold: float = ACERTIVIDADE_THRESHOLD,
    mandatory_fields: "set[str] | None" = None,
) -> dict[str, list[ExtractorProposal]]:
    """Judge each field's candidates and keep the winning chain when it clears the gate.

    Two-axis gate: every field must clear ``threshold`` coverage; mandatory fields
    additionally need winner Acertividade >= ``acertividade_threshold``. Best-effort
    fields ride on coverage alone (their consensus signal is too weak to reject on).
    """
    tournament = tournament or ExtractorTournament()
    mandatory = set(MANDATORY_EXTRACTOR_FIELDS) if mandatory_fields is None else mandatory_fields
    htmls = list(htmls)
    page_urls = list(urls) if urls is not None else [None] * len(htmls)
    verified: dict[str, list[ExtractorProposal]] = {}
    for field_name, candidates in candidates_by_field.items():
        anchors = [
            _anchor_set(field_name, html, url)
            for html, url in zip(htmls, page_urls)
        ]
        result = tournament.judge(field_name, candidates, htmls, anchors=anchors)
        if result.winner is None:
            continue
        report = verifier.verify_chain(field_name, result.chain, htmls)
        if report.pass_rate < threshold:
            continue
        if field_name in mandatory and result.acertividade < acertividade_threshold:
            continue
        verified[field_name] = list(result.chain)
    return verified


async def generate_candidates(
    synthesizer,
    *,
    htmls,
    fields,
    prior_failures,
    execution_model,
) -> dict[str, list[ExtractorProposal]]:
    """Run one source-biased synthesis per strategy, grouping candidates per field."""
    by_field: dict[str, list[ExtractorProposal]] = {}
    seen: set[tuple[str, str, str, str | None]] = set()
    for strategy in CANDIDATE_STRATEGIES:
        proposal = await synthesizer.synthesize(
            htmls=htmls,
            fields=fields,
            prior_failures=prior_failures,
            execution_model=execution_model,
            strategy=strategy,
        )
        if proposal is None:
            continue
        for extractor in proposal.extractors:
            key = (
                extractor.field_name,
                extractor.source_type,
                extractor.selector_value,
                extractor.pipeline,
            )
            if key in seen:
                continue
            seen.add(key)
            by_field.setdefault(extractor.field_name, []).append(extractor)
    return by_field


@dataclass(frozen=True)
class CandidateScore:
    extractor: ExtractorProposal
    acertividade: float
    coverage: float


@dataclass(frozen=True)
class TournamentResult:
    field_name: str
    winner: ExtractorProposal | None
    chain: tuple[ExtractorProposal, ...]
    scores: tuple[CandidateScore, ...]
    acertividade: float = 0.0


def _normalize(value: object | None) -> str | None:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip().casefold()
    return text or None


class ExtractorTournament:
    def judge(
        self,
        field_name: str,
        candidates: Sequence[ExtractorProposal],
        htmls: Sequence[str],
        anchors: Sequence[set[str]] | None = None,
    ) -> TournamentResult:
        candidates = list(candidates)
        if not candidates:
            return TournamentResult(field_name, None, (), ())
        sample_size = len(htmls)
        norm = [
            [_normalize(self._final_value(field_name, candidate, html)) for html in htmls]
            for candidate in candidates
        ]
        truths = [
            self._page_truth(norm, page, anchors[page] if anchors else None)
            for page in range(sample_size)
        ]

        judged = [page for page in range(sample_size) if truths[page] is not None]
        scores: list[CandidateScore] = []
        for index, values in enumerate(norm):
            filled = sum(1 for value in values if value is not None)
            matches = sum(1 for page in judged if values[page] == truths[page])
            scores.append(
                CandidateScore(
                    extractor=candidates[index],
                    acertividade=matches / len(judged) if judged else 0.0,
                    coverage=filled / sample_size if sample_size else 0.0,
                )
            )

        winner_index = max(
            range(len(candidates)),
            key=lambda index: (
                scores[index].acertividade,
                scores[index].coverage,
                -_source_rank(candidates[index]),
                -index,
            ),
        )
        if scores[winner_index].coverage == 0.0:
            return TournamentResult(field_name, None, (), tuple(scores))
        chain = self._build_chain(candidates, scores, norm, winner_index)
        return TournamentResult(
            field_name=field_name,
            winner=candidates[winner_index],
            chain=chain,
            scores=tuple(scores),
            acertividade=scores[winner_index].acertividade,
        )

    def _build_chain(
        self,
        candidates: list[ExtractorProposal],
        scores: list[CandidateScore],
        norm: list[list[str | None]],
        winner_index: int,
    ) -> tuple[ExtractorProposal, ...]:
        chain = [candidates[winner_index].model_copy(update={"priority": 1})]
        runners_up = sorted(
            (index for index in range(len(candidates)) if index != winner_index),
            key=lambda index: (-scores[index].acertividade, -scores[index].coverage, index),
        )
        priority = 2
        for index in runners_up:
            if self._agrees(norm[winner_index], norm[index]):
                chain.append(candidates[index].model_copy(update={"priority": priority}))
                priority += 1
        return tuple(chain)

    @staticmethod
    def _agrees(winner: list[str | None], candidate: list[str | None]) -> bool:
        return all(
            winner[page] == candidate[page]
            for page in range(len(winner))
            if winner[page] is not None and candidate[page] is not None
        )

    def _page_truth(
        self,
        norm: list[list[str | None]],
        page: int,
        anchor_set: set[str] | None = None,
    ) -> str | None:
        votes = Counter(
            candidate_finals[page]
            for candidate_finals in norm
            if candidate_finals[page] is not None
        )
        if anchor_set:
            for value in list(votes):
                if value in anchor_set:
                    votes[value] += ANCHOR_WEIGHT
        return votes.most_common(1)[0][0] if votes else None

    def _final_value(
        self,
        field_name: str,
        candidate: ExtractorProposal,
        html: str,
    ) -> str | None:
        try:
            raw = extract_field_value([candidate], html)
        except Exception:
            return None
        if raw is None or str(raw).strip() == "":
            return None
        return loader_treatment(field_name, candidate.output_type, raw)
