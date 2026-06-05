from __future__ import annotations

from app.schemas import ExtractorProposal
from app.services.tournament import ExtractorTournament


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
