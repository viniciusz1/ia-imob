from __future__ import annotations

import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass, replace

from app.schemas import ExtractorProposal
from app.services.anchors import anchor_values
from app.services.extraction import extract_field_value, loader_treatment

from imobiliarias.config.field_catalog import (  # noqa: E402
    MANDATORY_EXTRACTOR_FIELDS,
    synthesis_output_type,
)

ACERTIVIDADE_THRESHOLD = 0.8
PRESENCA_FLOOR = 5

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


def run_tournament(
    candidates_by_field: dict[str, list[ExtractorProposal]],
    htmls,
    *,
    verifier,
    threshold: float,
    tournament: "ExtractorTournament | None" = None,
    urls=None,
    acertividade_threshold: float = ACERTIVIDADE_THRESHOLD,
    mandatory_fields: "set[str] | None" = None,
) -> tuple[dict[str, list[ExtractorProposal]], dict[str, TournamentResult]]:
    """Judge each field's candidates, returning the verified chains plus every
    field's TournamentResult (for observability, including gated-out fields).

    Mandatory fields keep the two-axis gate: chain coverage >= ``threshold`` and
    winner Acertividade >= ``acertividade_threshold``. Best-effort fields are judged
    only where the field provably exists (Presenca): winner acertividade over
    present pages >= ``threshold``, with at least ``PRESENCA_FLOOR`` present pages —
    a field absent from part of the site is not an extraction failure.
    """
    tournament = tournament or ExtractorTournament()
    mandatory = set(MANDATORY_EXTRACTOR_FIELDS) if mandatory_fields is None else mandatory_fields
    htmls = list(htmls)
    page_urls = list(urls) if urls is not None else [None] * len(htmls)
    verified: dict[str, list[ExtractorProposal]] = {}
    results: dict[str, TournamentResult] = {}
    for field_name, candidates in candidates_by_field.items():
        anchors = [
            _anchor_set(field_name, html, url)
            for html, url in zip(htmls, page_urls)
        ]
        result = tournament.judge(field_name, candidates, htmls, anchors=anchors)
        gated_reason: str | None = None
        if result.winner is None:
            gated_reason = "no_winner"
        elif field_name in mandatory:
            report = verifier.verify_chain(field_name, result.chain, htmls)
            if report.pass_rate < threshold:
                gated_reason = f"chain_coverage {report.pass_rate:.2f} < {threshold}"
            elif result.acertividade < acertividade_threshold:
                gated_reason = (
                    f"acertividade {result.acertividade:.2f} < {acertividade_threshold}"
                )
        else:
            if result.presenca < PRESENCA_FLOOR:
                gated_reason = f"presenca {result.presenca} < {PRESENCA_FLOOR}"
            elif result.acertividade_presenca < threshold:
                gated_reason = (
                    f"acertividade_presenca {result.acertividade_presenca:.2f} < {threshold}"
                )
        result = replace(result, verified=gated_reason is None, gated_reason=gated_reason)
        results[field_name] = result
        if result.verified:
            verified[field_name] = list(result.chain)
    return verified, results


def select_extractors(candidates_by_field, htmls, **kwargs) -> dict[str, list[ExtractorProposal]]:
    """Verified chains only — thin wrapper over :func:`run_tournament`."""
    return run_tournament(candidates_by_field, htmls, **kwargs)[0]


def summarize_result(result: TournamentResult) -> dict:
    """JSON-able summary of a TournamentResult for the attempt report."""
    return {
        "winner": (
            {
                "source_type": result.winner.source_type,
                "selector_value": result.winner.selector_value,
            }
            if result.winner
            else None
        ),
        "acertividade": round(result.acertividade, 3),
        "presenca": result.presenca,
        "acertividade_presenca": round(result.acertividade_presenca, 3),
        "anchor_agreement": {
            "pages": result.anchor_pages,
            "matches": result.anchor_matches,
            "rate": round(result.anchor_matches / result.anchor_pages, 3)
            if result.anchor_pages
            else 0.0,
        },
        "verified": result.verified,
        "gated_reason": result.gated_reason,
        "candidates": [
            {
                "source_type": score.extractor.source_type,
                "selector_value": score.extractor.selector_value,
                "acertividade": round(score.acertividade, 3),
                "coverage": round(score.coverage, 3),
            }
            for score in result.scores
        ],
    }


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
    # Presenca: pages where the field provably exists (anchor, or two witnesses
    # with distinct selectors agreeing) — evidence independent of the winner.
    presenca: int = 0
    acertividade_presenca: float = 0.0
    anchor_pages: int = 0
    anchor_matches: int = 0
    verified: bool = False
    gated_reason: str | None = None


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
        selectors = [candidate.selector_value for candidate in candidates]
        truths = [
            self._page_truth(norm, page, anchors[page] if anchors else None, selectors)
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
        presenca, presenca_matches = self._presenca(norm, candidates, winner_index, anchors)
        anchor_pages, anchor_matches = self._anchor_agreement(norm, winner_index, anchors)
        return TournamentResult(
            field_name=field_name,
            winner=candidates[winner_index],
            chain=chain,
            scores=tuple(scores),
            acertividade=scores[winner_index].acertividade,
            presenca=presenca,
            acertividade_presenca=presenca_matches / presenca if presenca else 0.0,
            anchor_pages=anchor_pages,
            anchor_matches=anchor_matches,
        )

    @staticmethod
    def _anchor_agreement(
        norm: list[list[str | None]],
        winner_index: int,
        anchors: Sequence[set[str]] | None,
    ) -> tuple[int, int]:
        if not anchors:
            return 0, 0
        anchor_pages = 0
        anchor_matches = 0
        for page, anchor_set in enumerate(anchors):
            if not anchor_set:
                continue
            anchor_pages += 1
            if norm[winner_index][page] in anchor_set:
                anchor_matches += 1
        return anchor_pages, anchor_matches

    @staticmethod
    def _presenca(
        norm: list[list[str | None]],
        candidates: list[ExtractorProposal],
        winner_index: int,
        anchors: Sequence[set[str]] | None,
    ) -> tuple[int, int]:
        """Count pages where the field provably exists and, of those, where the
        winner's value is corroborated by evidence independent of itself."""
        selectors = [candidate.selector_value for candidate in candidates]
        present_pages = 0
        winner_matches = 0
        for page in range(len(norm[0]) if norm else 0):
            anchor_set = anchors[page] if anchors else set()
            witnesses: dict[str, set[str]] = {}
            for index, values in enumerate(norm):
                if values[page] is not None:
                    witnesses.setdefault(values[page], set()).add(selectors[index])
            agreed = any(len(sels) >= 2 for sels in witnesses.values())
            if not anchor_set and not agreed:
                continue
            present_pages += 1
            winner_value = norm[winner_index][page]
            if winner_value is None:
                continue
            corroborated = winner_value in anchor_set or any(
                selector != selectors[winner_index]
                for selector in witnesses.get(winner_value, set())
            )
            if corroborated:
                winner_matches += 1
        return present_pages, winner_matches

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
        selectors: list[str] | None = None,
    ) -> str | None:
        # One vote per distinct selector: the same selector re-proposed with a
        # different pipeline is the same witness, not extra consensus.
        votes: Counter[str] = Counter()
        seen: set[tuple[object, str]] = set()
        for index, candidate_finals in enumerate(norm):
            value = candidate_finals[page]
            if value is None:
                continue
            key = (selectors[index] if selectors else index, value)
            if key in seen:
                continue
            seen.add(key)
            votes[value] += 1
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
