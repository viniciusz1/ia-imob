from __future__ import annotations

import re
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass

from app.schemas import ExtractorProposal
from app.services.extraction import extract_field_value, loader_treatment


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
    ) -> TournamentResult:
        candidates = list(candidates)
        if not candidates:
            return TournamentResult(field_name, None, (), ())
        sample_size = len(htmls)
        norm = [
            [_normalize(self._final_value(field_name, candidate, html)) for html in htmls]
            for candidate in candidates
        ]
        truths = [self._page_truth(norm, page) for page in range(sample_size)]

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
            key=lambda index: (scores[index].acertividade, scores[index].coverage, -index),
        )
        if scores[winner_index].coverage == 0.0:
            return TournamentResult(field_name, None, (), tuple(scores))
        chain = self._build_chain(candidates, scores, norm, winner_index)
        return TournamentResult(
            field_name=field_name,
            winner=candidates[winner_index],
            chain=chain,
            scores=tuple(scores),
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
    ) -> str | None:
        votes = Counter(
            candidate_finals[page]
            for candidate_finals in norm
            if candidate_finals[page] is not None
        )
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
