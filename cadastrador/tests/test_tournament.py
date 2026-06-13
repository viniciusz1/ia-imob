from __future__ import annotations

import pytest

from app.schemas import ExtractorProposal, OnboardingProposal
from app.services.tournament import (
    CandidateScore,
    ExtractorTournament,
    TournamentResult,
    generate_candidates,
    run_tournament,
    select_extractors,
    summarize_result,
)
from app.services.verification import SelectorVerifier


class _StubTournament:
    def __init__(self, by_field):
        self.by_field = by_field

    def judge(self, field_name, candidates, htmls, anchors=None):
        return self.by_field[field_name]


def _candidate(
    field_name, source_type, selector_value, *, output_type="text", priority=1, pipeline=None
):
    return ExtractorProposal(
        field_name=field_name,
        source_type=source_type,
        selector_value=selector_value,
        output_type=output_type,
        priority=priority,
        pipeline=pipeline,
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


_STUFFED_HTML = (
    '<html><body>'
    '<span class="x">Vila</span>'
    '<span class="y">Centro</span>'
    '<span class="z">Centro</span>'
    '</body></html>'
)


def test_same_selector_with_different_pipeline_votes_once():
    stuffed = _candidate("bairro", "css", ".x::text")
    stuffed_again = _candidate("bairro", "css", ".x::text", pipeline="strip")
    honest_y = _candidate("bairro", "css", ".y::text")
    honest_z = _candidate("bairro", "css", ".z::text")

    result = ExtractorTournament().judge(
        "bairro",
        [stuffed, stuffed_again, honest_y, honest_z],
        [_STUFFED_HTML, _STUFFED_HTML],
    )

    assert result.winner.selector_value in {".y::text", ".z::text"}


_SELECT_HTML = (
    '<html><body>'
    '<span class="preco">R$ 500.000</span>'
    '<h1>Casa</h1>'
    '</body></html>'
)


def test_select_extractors_keeps_plausible_winners_and_drops_unfillable():
    candidates = {
        "valor": [_candidate("valor", "css", ".preco::text", output_type="number")],
        "tipo": [_candidate("tipo", "css", "h1::text")],
        "bairro": [_candidate("bairro", "css", ".missing::text")],
    }

    verified = select_extractors(
        candidates,
        [_SELECT_HTML, _SELECT_HTML],
        verifier=SelectorVerifier(),
        threshold=0.9,
    )

    assert set(verified) == {"valor", "tipo"}
    assert [extractor.selector_value for extractor in verified["valor"]] == [".preco::text"]


_TIE_HTML = (
    '<html><body>'
    '<span class="x">Joinville</span>'
    '<span class="y">Jaragua</span>'
    '</body></html>'
)


def test_anchor_breaks_candidate_tie_toward_the_anchored_value():
    joinville = _candidate("cidade", "css", ".x::text")
    jaragua = _candidate("cidade", "css", ".y::text")

    without = ExtractorTournament().judge(
        "cidade", [joinville, jaragua], [_TIE_HTML, _TIE_HTML]
    )
    with_anchor = ExtractorTournament().judge(
        "cidade",
        [joinville, jaragua],
        [_TIE_HTML, _TIE_HTML],
        anchors=[{"jaragua"}, {"jaragua"}],
    )

    assert without.winner.selector_value == ".x::text"
    assert with_anchor.winner.selector_value == ".y::text"


_SOURCE_HTML = (
    '<html><head><meta property="og:title" content="Centro"></head>'
    '<body><span class="x">Centro</span></body></html>'
)


def test_ties_prefer_structured_source_over_dom():
    dom = _candidate("cidade", "css", ".x::text")
    structured = _candidate("cidade", "og", "title")

    result = ExtractorTournament().judge(
        "cidade", [dom, structured], [_SOURCE_HTML, _SOURCE_HTML]
    )

    assert result.winner.source_type == "og"


_VALOR_ANCHOR_HTML = (
    '<html><body>'
    '<span class="x">1234</span>'
    '<span class="y">R$ 500.000</span>'
    '</body></html>'
)


def test_select_extractors_uses_anchor_to_pick_the_real_price():
    candidates = {
        "valor": [
            _candidate("valor", "css", ".x::text", output_type="number"),
            _candidate("valor", "css", ".y::text", output_type="number"),
        ]
    }

    verified = select_extractors(
        candidates,
        [_VALOR_ANCHOR_HTML, _VALOR_ANCHOR_HTML],
        verifier=SelectorVerifier(),
        threshold=0.9,
    )

    assert verified["valor"][0].selector_value == ".y::text"


_LINK_HTML = (
    '<html><head><link rel="canonical" href="https://x.test/imovel/1"></head>'
    '<body><a class="other" href="https://x.test/contato">x</a></body></html>'
)


def test_select_extractors_anchors_link_imovel_to_page_url():
    candidates = {
        "link_imovel": [
            _candidate("link_imovel", "css", "a.other::attr(href)", output_type="link_url"),
            _candidate("link_imovel", "xpath", "//link[@rel='canonical']/@href", output_type="link_url"),
        ]
    }

    verified = select_extractors(
        candidates,
        [_LINK_HTML, _LINK_HTML],
        verifier=SelectorVerifier(),
        threshold=0.9,
        urls=["https://x.test/imovel/1", "https://x.test/imovel/1"],
    )

    assert verified["link_imovel"][0].selector_value == "//link[@rel='canonical']/@href"


def test_mandatory_field_dropped_when_acertividade_below_threshold():
    html = '<html><body><span class="v">R$ 500.000</span></body></html>'
    winner = _candidate("valor", "css", ".v::text", output_type="number")
    result = TournamentResult(
        "valor", winner, (winner,), (CandidateScore(winner, 0.5, 1.0),), acertividade=0.5
    )

    verified = select_extractors(
        {"valor": [winner]},
        [html, html],
        verifier=SelectorVerifier(),
        threshold=0.9,
        tournament=_StubTournament({"valor": result}),
    )

    assert "valor" not in verified


def test_best_effort_field_dropped_without_presenca():
    html = '<html><body><span class="v">2</span></body></html>'
    winner = _candidate("quartos", "css", ".v::text", output_type="number")
    result = TournamentResult(
        "quartos", winner, (winner,), (CandidateScore(winner, 0.5, 1.0),), acertividade=0.5
    )

    verified = select_extractors(
        {"quartos": [winner]},
        [html, html],
        verifier=SelectorVerifier(),
        threshold=0.9,
        tournament=_StubTournament({"quartos": result}),
    )

    assert "quartos" not in verified


_QUARTOS_PRESENT_HTML = (
    '<html><body><div class="d">'
    '<span>2</span><span>Quarto(s)</span>'
    '</div></body></html>'
)
_QUARTOS_ABSENT_HTML = '<html><body><p>Terreno comercial</p></body></html>'


def test_optional_field_verified_by_acertividade_where_present():
    candidates = {
        "quartos": [
            _candidate(
                "quartos",
                "xpath",
                '//div[@class="d"]/span[1]/text()',
                output_type="number",
            )
        ]
    }
    htmls = [_QUARTOS_PRESENT_HTML] * 5 + [_QUARTOS_ABSENT_HTML] * 2

    verified, _ = run_tournament(
        candidates, htmls, verifier=SelectorVerifier(), threshold=0.9
    )

    assert "quartos" in verified


def test_optional_field_dropped_below_presenca_floor():
    candidates = {
        "quartos": [
            _candidate(
                "quartos",
                "xpath",
                '//div[@class="d"]/span[1]/text()',
                output_type="number",
            )
        ]
    }
    htmls = [_QUARTOS_PRESENT_HTML] * 3 + [_QUARTOS_ABSENT_HTML] * 4

    verified, _ = run_tournament(
        candidates, htmls, verifier=SelectorVerifier(), threshold=0.9
    )

    assert "quartos" not in verified


_QUARTOS_GARBAGE_HTML = (
    '<html><body><div class="d">'
    '<span>2</span><span>Quarto(s)</span>'
    '</div><span class="x">3</span></body></html>'
)


def test_optional_field_dropped_when_winner_contradicts_the_anchor():
    candidates = {
        "quartos": [_candidate("quartos", "css", ".x::text", output_type="number")]
    }
    htmls = [_QUARTOS_GARBAGE_HTML] * 7

    verified, _ = run_tournament(
        candidates, htmls, verifier=SelectorVerifier(), threshold=0.9
    )

    assert "quartos" not in verified


_SOLAR_PRESENT_HTML = (
    '<html><body>'
    '<span class="a">Norte</span>'
    '<span class="b">Norte</span>'
    '</body></html>'
)
_SOLAR_ABSENT_HTML = '<html><body><p>sem orientacao</p></body></html>'


def test_unanchored_optional_field_verified_by_two_agreeing_witnesses():
    candidates = {
        "posicao_solar": [
            _candidate("posicao_solar", "css", ".a::text"),
            _candidate("posicao_solar", "css", ".b::text"),
        ]
    }
    htmls = [_SOLAR_PRESENT_HTML] * 6 + [_SOLAR_ABSENT_HTML] * 2

    verified, _ = run_tournament(
        candidates, htmls, verifier=SelectorVerifier(), threshold=0.9
    )

    assert "posicao_solar" in verified


def test_unanchored_optional_field_with_single_witness_abstains():
    candidates = {
        "posicao_solar": [_candidate("posicao_solar", "css", ".a::text")]
    }
    htmls = [_SOLAR_PRESENT_HTML] * 8

    verified, _ = run_tournament(
        candidates, htmls, verifier=SelectorVerifier(), threshold=0.9
    )

    assert "posicao_solar" not in verified


def test_run_tournament_returns_verified_chains_and_results():
    html = '<html><body><span class="v">R$ 500.000</span></body></html>'
    candidates = {"valor": [_candidate("valor", "css", ".v::text", output_type="number")]}

    verified, results = run_tournament(
        candidates, [html, html], verifier=SelectorVerifier(), threshold=0.9
    )

    assert "valor" in verified
    assert results["valor"].winner.selector_value == ".v::text"
    assert results["valor"].acertividade == 1.0


def test_gated_out_field_is_reported_with_the_reason():
    candidates = {
        "quartos": [
            _candidate(
                "quartos",
                "xpath",
                '//div[@class="d"]/span[1]/text()',
                output_type="number",
            )
        ]
    }
    htmls = [_QUARTOS_PRESENT_HTML] * 3 + [_QUARTOS_ABSENT_HTML] * 4

    verified, results = run_tournament(
        candidates, htmls, verifier=SelectorVerifier(), threshold=0.9
    )
    summary = summarize_result(results["quartos"])

    assert "quartos" not in verified
    assert summary["verified"] is False
    assert "presenca" in summary["gated_reason"]


def test_summarize_result_reports_winner_and_candidate_scores():
    winner = _candidate("valor", "og", "price", output_type="number")
    loser = _candidate("valor", "css", ".x::text", output_type="number")
    result = TournamentResult(
        "valor",
        winner,
        (winner,),
        (CandidateScore(winner, 1.0, 1.0), CandidateScore(loser, 0.4, 1.0)),
        acertividade=1.0,
    )

    summary = summarize_result(result)

    assert summary["winner"]["selector_value"] == "price"
    assert summary["acertividade"] == 1.0
    assert len(summary["candidates"]) == 2
    assert {c["selector_value"] for c in summary["candidates"]} == {"price", ".x::text"}
