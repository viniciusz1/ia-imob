from __future__ import annotations

import pytest

from app.schemas import ExtractorProposal, OnboardingProposal
from app.services.tournament import ExtractorTournament, generate_candidates


def _candidate(field_name, source_type, selector_value, *, output_type="text", priority=1):
    return ExtractorProposal(
        field_name=field_name,
        source_type=source_type,
        selector_value=selector_value,
        output_type=output_type,
        priority=priority,
    )


_THREE_BAIRRO_HTML = (
    '<html><body>'
    '<span class="a">Centro</span>'
    '<span class="b">Centro</span>'
    '<span class="c">Vila Nova</span>'
    '</body></html>'
)


def test_single_candidate_wins_and_forms_the_chain():
    html = '<html><body><span class="v">Casa</span></body></html>'
    candidate = _candidate("tipo", "css", ".v::text")

    result = ExtractorTournament().judge("tipo", [candidate], [html, html])

    assert result.winner is not None
    assert result.winner.selector_value == ".v::text"
    assert [extractor.selector_value for extractor in result.chain] == [".v::text"]
    assert result.chain[0].priority == 1


def test_consensus_picks_the_plurality_value():
    dissenter = _candidate("bairro", "css", ".c::text")
    agree_a = _candidate("bairro", "css", ".a::text")
    agree_b = _candidate("bairro", "css", ".b::text")

    result = ExtractorTournament().judge(
        "bairro",
        [dissenter, agree_a, agree_b],
        [_THREE_BAIRRO_HTML, _THREE_BAIRRO_HTML],
    )

    assert result.winner is not None
    assert result.winner.selector_value in {".a::text", ".b::text"}
    assert result.winner.selector_value != ".c::text"


_CHAIN_HTML = (
    '<html><body>'
    '<span class="w">Centro</span>'
    '<span class="r">Centro</span>'
    '<span class="d">Outro</span>'
    '</body></html>'
)


def test_agreeing_runner_up_becomes_fallback_disagreeing_is_excluded():
    winner = _candidate("bairro", "css", ".w::text")
    agreeing = _candidate("bairro", "css", ".r::text")
    disagreeing = _candidate("bairro", "css", ".d::text")

    result = ExtractorTournament().judge(
        "bairro",
        [winner, agreeing, disagreeing],
        [_CHAIN_HTML, _CHAIN_HTML],
    )

    assert [extractor.selector_value for extractor in result.chain] == [
        ".w::text",
        ".r::text",
    ]
    assert [extractor.priority for extractor in result.chain] == [1, 2]
    assert ".d::text" not in {extractor.selector_value for extractor in result.chain}


def test_no_candidate_fills_yields_no_winner():
    empty_page = "<html><body><p>sem dados</p></body></html>"
    candidate = _candidate("valor", "css", ".missing::text", output_type="number")

    result = ExtractorTournament().judge("valor", [candidate], [empty_page, empty_page])

    assert result.winner is None
    assert result.chain == ()


class _StrategySynthesizer:
    """Fake synthesizer that returns canned extractors per source strategy."""

    def __init__(self, by_strategy):
        self.by_strategy = by_strategy
        self.calls = []

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model, strategy=None):
        self.calls.append(strategy)
        return OnboardingProposal(
            strategy=execution_model,
            name="x",
            extractors=list(self.by_strategy.get(strategy, [])),
        )


@pytest.mark.asyncio
async def test_generate_candidates_uses_three_distinct_source_strategies():
    fake = _StrategySynthesizer(
        {
            "dom": [_candidate("valor", "xpath", "//h6/text()", output_type="number")],
            "structured": [_candidate("valor", "og", "price", output_type="number")],
            "text": [_candidate("valor", "css", ".t::text", output_type="number")],
        }
    )

    candidates = await generate_candidates(
        fake,
        htmls=["<html></html>"],
        fields=["valor"],
        prior_failures={},
        execution_model="sitemap",
    )

    assert len(fake.calls) == 3
    assert len(set(fake.calls)) == 3
    assert len(candidates["valor"]) == 3


@pytest.mark.asyncio
async def test_generate_candidates_dedupes_identical_selectors_across_strategies():
    fake = _StrategySynthesizer(
        {
            "dom": [_candidate("cidade", "og", "title")],
            "structured": [_candidate("cidade", "og", "title")],
            "text": [],
        }
    )

    candidates = await generate_candidates(
        fake,
        htmls=["<html></html>"],
        fields=["cidade"],
        prior_failures={},
        execution_model="sitemap",
    )

    assert len(candidates["cidade"]) == 1


@pytest.mark.asyncio
async def test_generate_candidates_allows_abstention_per_field():
    fake = _StrategySynthesizer(
        {
            "dom": [_candidate("piscina", "xpath", "//x", output_type="boolean")],
            "structured": [],
            "text": [_candidate("piscina", "css", ".t::text", output_type="boolean")],
        }
    )

    candidates = await generate_candidates(
        fake,
        htmls=["<html></html>"],
        fields=["piscina"],
        prior_failures={},
        execution_model="sitemap",
    )

    assert len(candidates["piscina"]) == 2
