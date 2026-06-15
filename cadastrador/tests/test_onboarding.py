from __future__ import annotations

import json

import httpx
import pytest

from app.schemas import (
    ExtractorProposal,
    Identity,
    OnboardingProposal,
    PersistResult,
    ValidationReport,
)
from app.services.discovery import SitemapProbeResult
from app.services.onboarding import Discovery, OnboardingService
from app.services.verification import SelectorVerifier


class _FixedSynthesizer:
    """Returns the same extractors regardless of source strategy."""

    def __init__(self, extractors):
        self.extractors = extractors

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model, strategy=None):
        return OnboardingProposal(
            strategy=execution_model,
            name="ignored",
            extractors=[extractor.model_copy() for extractor in self.extractors],
        )


def _service(llm):
    return OnboardingService(
        fetcher=None,
        probe=None,
        llm=llm,
        verifier=SelectorVerifier(),
        validator=None,
    )


class _Cursor:
    def __init__(self, conn):
        self.conn = conn

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query, params=None):
        self.conn.executed.append((query, params))
        if "RETURNING id" in query:
            self.conn.next_id += 1
            self.conn.fetchone_value = (self.conn.next_id,)

    def fetchone(self):
        return self.conn.fetchone_value


class _Conn:
    def __init__(self):
        self.executed = []
        self.commits = 0
        self.next_id = 40
        self.fetchone_value = None

    def cursor(self):
        return _Cursor(self)

    def commit(self):
        self.commits += 1


class _DnsFailingFetcher:
    async def fetch(self, url):
        raise httpx.ConnectError("[Errno -3] Temporary failure in name resolution")


def _event_payloads(body: bytes) -> list[dict]:
    payloads = []
    for event in body.decode("utf-8").strip().split("\n\n"):
        data_lines = [
            line.removeprefix("data: ")
            for line in event.splitlines()
            if line.startswith("data: ")
        ]
        if data_lines:
            payloads.append(json.loads("".join(data_lines)))
    return payloads


def _decoded_events(body: bytes) -> list[tuple[str, dict]]:
    events = []
    for event in body.decode("utf-8").strip().split("\n\n"):
        event_name = "message"
        data_lines = []
        for line in event.splitlines():
            if line.startswith("event: "):
                event_name = line.removeprefix("event: ")
            elif line.startswith("data: "):
                data_lines.append(line.removeprefix("data: "))
        if data_lines:
            events.append((event_name, json.loads("".join(data_lines))))
    return events


_TOURNAMENT_HTML = (
    '<html><head><link rel="canonical" href="https://x.test/imovel/1"></head>'
    '<body>'
    '<span class="tipo">Casa</span>'
    '<span class="valor">R$ 500.000</span>'
    '<span class="bairro">Centro</span>'
    '<span class="cidade">Joinville</span>'
    '</body></html>'
)


class _TournamentFetcher:
    async def fetch(self, url):
        return _TOURNAMENT_HTML

    async def fetch_pairs(self, urls):
        return [(url, _TOURNAMENT_HTML) for url in urls]


class _TournamentProbe:
    async def probe(self, domain):
        return SitemapProbeResult(
            property_urls=["https://x.test/imovel/1", "https://x.test/imovel/2"],
            selected_sitemap_url="https://x.test/sitemap.xml",
        )


class _TournamentLlm:
    def __init__(self):
        self.html_counts = []

    async def resolve_identity(self, url, html):
        return Identity(domain="x.test", name="Imob X")

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model, strategy=None):
        self.html_counts.append(len(htmls))
        selectors = {
            "tipo": ("css", ".tipo::text", "text"),
            "valor": ("css", ".valor::text", "number"),
            "bairro": ("css", ".bairro::text", "text"),
            "cidade": ("css", ".cidade::text", "text"),
            "link_imovel": ("css", 'link[rel="canonical"]::attr(href)', "link_url"),
        }
        extractors = []
        if strategy == "dom":
            extractors = [
                ExtractorProposal(
                    field_name=field,
                    source_type=source_type,
                    selector_value=selector,
                    output_type=output_type,
                )
                for field, (source_type, selector, output_type) in selectors.items()
                if field in fields
            ]
        return OnboardingProposal(
            strategy=execution_model,
            name="Imob X",
            extractors=extractors,
        )


class _ActiveValidator:
    async def run(self, agency_id, agency_type, name):
        return ValidationReport(outcome="active", sample_size=2, fields={}, issues=[])


_HTML = (
    '<html><body>'
    '<span class="preco">R$ 500.000</span>'
    '<h1>Casa</h1>'
    '</body></html>'
)


@pytest.mark.asyncio
async def test_stream_onboarding_reports_name_resolution_failure():
    service = OnboardingService(
        fetcher=_DnsFailingFetcher(),
        probe=None,
        llm=None,
        verifier=SelectorVerifier(),
        validator=None,
    )
    conn = _Conn()

    body = b""
    async for chunk in service.stream_onboarding(url="missing.test", name="Missing", conn=conn):
        body += chunk

    payloads = _event_payloads(body)
    error = payloads[-1]

    assert payloads[0] == {"step": "fetching"}
    assert error["reason"] == "name_resolution_failed"
    assert "missing.test" in error["message"]
    assert "Temporary failure in name resolution" in error["detail"]
    recorded_report = json.loads(conn.executed[-1][1][5])
    assert recorded_report["reason"].startswith("name_resolution_failed:")


@pytest.mark.asyncio
async def test_stream_onboarding_emits_tournament_observability(monkeypatch):
    import app.services.onboarding as onboarding

    monkeypatch.setattr(
        onboarding,
        "persist_agency",
        lambda conn, proposal, identity: PersistResult(
            agency_type="sitemap",
            agency_id=123,
            name=identity.name,
            domain=identity.domain,
            is_active=True,
            extractors_inserted=len(proposal.extractors),
        ),
    )
    service = OnboardingService(
        fetcher=_TournamentFetcher(),
        probe=_TournamentProbe(),
        llm=_TournamentLlm(),
        verifier=SelectorVerifier(),
        validator=_ActiveValidator(),
    )

    body = b""
    async for chunk in service.stream_onboarding(url="https://x.test", name="Imob X", conn=_Conn()):
        body += chunk

    events = _decoded_events(body)
    progress = [payload for event, payload in events if event == "progress"]
    result = next(payload for event, payload in events if event == "result")

    assert {"step": "tournament_round", "round": 1} in progress
    assert any(
        payload["step"] == "tournament_field_winner"
        and payload["field"] == "valor"
        and payload["winner"]["selector_value"] == ".valor::text"
        for payload in progress
    )
    assert result["report"]["tournament"]["valor"]["anchor_agreement"]["rate"] == 1.0


@pytest.mark.asyncio
async def test_stream_onboarding_persists_html_evidence_for_successful_attempt(monkeypatch):
    import app.services.onboarding as onboarding

    monkeypatch.setattr(
        onboarding,
        "persist_agency",
        lambda conn, proposal, identity: PersistResult(
            agency_type="sitemap",
            agency_id=123,
            name=identity.name,
            domain=identity.domain,
            is_active=True,
            extractors_inserted=len(proposal.extractors),
        ),
    )
    conn = _Conn()
    service = OnboardingService(
        fetcher=_TournamentFetcher(),
        probe=_TournamentProbe(),
        llm=_TournamentLlm(),
        verifier=SelectorVerifier(),
        validator=_ActiveValidator(),
    )

    body = b""
    async for chunk in service.stream_onboarding(url="https://x.test", name="Imob X", conn=conn):
        body += chunk

    evidence_inserts = [
        params
        for query, params in conn.executed
        if "INSERT INTO agency_onboarding_evidence" in query
    ]

    assert b"event: result" in body
    assert len(evidence_inserts) == 2
    assert evidence_inserts[0][1] == 0
    assert evidence_inserts[0][2] == "https://x.test/imovel/1"
    assert evidence_inserts[0][4] == _TOURNAMENT_HTML
    assert evidence_inserts[1][1] == 1
    assert evidence_inserts[1][2] == "https://x.test/imovel/2"


@pytest.mark.asyncio
async def test_tournament_generation_uses_small_llm_evidence_set():
    llm = _TournamentLlm()
    discovery = Discovery(
        homepage_html=_TOURNAMENT_HTML,
        sample_htmls=[_TOURNAMENT_HTML] * 10,
        llm_htmls=[_TOURNAMENT_HTML] * 3,
        execution_model="sitemap",
        selected_sitemap_url="https://x.test/sitemap.xml",
        sample_urls=["https://x.test/imovel/1"] * 10,
    )

    await _service(llm)._tournament_proposal(
        discovery, Identity(domain="x.test", name="Imob X")
    )

    assert llm.html_counts == [3, 3, 3]


@pytest.mark.asyncio
async def test_tournament_proposal_builds_sitemap_proposal_from_verified_chains():
    llm = _FixedSynthesizer(
        [
            ExtractorProposal(field_name="valor", source_type="css", selector_value=".preco::text", output_type="number"),
            ExtractorProposal(field_name="tipo", source_type="css", selector_value="h1::text", output_type="text"),
            ExtractorProposal(field_name="bairro", source_type="css", selector_value=".missing::text", output_type="text"),
        ]
    )
    discovery = Discovery(
        homepage_html=_HTML,
        sample_htmls=[_HTML, _HTML],
        execution_model="sitemap",
        selected_sitemap_url="https://x.test/sitemap.xml",
    )

    run = await _service(llm)._tournament_proposal(
        discovery, Identity(domain="x.test", name="Imob X")
    )
    proposal = run.proposal
    verified_fields = run.verified_fields

    assert proposal.strategy == "sitemap"
    assert proposal.name == "Imob X"
    assert proposal.sitemap_url == "https://x.test/sitemap.xml"
    assert verified_fields == {"valor", "tipo"}
    selectors = {extractor.field_name: extractor.selector_value for extractor in proposal.extractors}
    assert selectors == {"valor": ".preco::text", "tipo": "h1::text"}


class _RetryStrategySynthesizer:
    """First round proposes a broken valor selector; later rounds (which carry
    prior_failures) propose a working one."""

    def __init__(self):
        self.seen_failures = []

    async def synthesize(self, *, htmls, fields, prior_failures, execution_model, strategy=None):
        self.seen_failures.append(dict(prior_failures))
        selector = ".good::text" if "valor" in prior_failures else ".bad::text"
        return OnboardingProposal(
            strategy=execution_model,
            name="x",
            extractors=[
                ExtractorProposal(
                    field_name="valor",
                    source_type="css",
                    selector_value=selector,
                    output_type="number",
                )
            ],
        )


@pytest.mark.asyncio
async def test_tournament_retries_failed_mandatory_field_with_prior_failures():
    html = '<html><body><span class="good">R$ 500.000</span></body></html>'
    synth = _RetryStrategySynthesizer()
    discovery = Discovery(
        homepage_html=html,
        sample_htmls=[html, html],
        execution_model="sitemap",
        selected_sitemap_url="https://x.test/sitemap.xml",
        sample_urls=["https://x.test/1", "https://x.test/2"],
    )

    run = await _service(synth)._tournament_proposal(
        discovery, Identity(domain="x.test", name="X")
    )

    assert "valor" in run.verified_fields
    assert any("valor" in failures for failures in synth.seen_failures)


@pytest.mark.asyncio
async def test_tournament_proposal_reports_mandatory_field_outcomes():
    llm = _FixedSynthesizer(
        [
            ExtractorProposal(field_name="valor", source_type="css", selector_value=".preco::text", output_type="number"),
        ]
    )
    discovery = Discovery(
        homepage_html=_HTML,
        sample_htmls=[_HTML, _HTML],
        execution_model="sitemap",
        selected_sitemap_url="https://x.test/sitemap.xml",
        sample_urls=["https://x.test/1", "https://x.test/2"],
    )

    run = await _service(llm)._tournament_proposal(
        discovery, Identity(domain="x.test", name="X")
    )
    report = run.report

    assert report["valor"]["winner"]["selector_value"] == ".preco::text"
    assert report["valor"]["acertividade"] == 1.0


_FULL_HTML = (
    '<html><body>'
    '<span class="preco">R$ 500.000</span>'
    '<h1>Casa</h1>'
    '<div class="d"><span>2</span><span>Quarto(s)</span></div>'
    '</body></html>'
)


@pytest.mark.asyncio
async def test_tournament_proposal_reports_gated_out_best_effort_fields():
    llm = _FixedSynthesizer(
        [
            ExtractorProposal(field_name="valor", source_type="css", selector_value=".preco::text", output_type="number"),
            ExtractorProposal(field_name="quartos", source_type="xpath", selector_value='//div[@class="d"]/span[1]/text()', output_type="number"),
        ]
    )
    discovery = Discovery(
        homepage_html=_FULL_HTML,
        sample_htmls=[_FULL_HTML, _FULL_HTML],
        execution_model="sitemap",
        selected_sitemap_url="https://x.test/sitemap.xml",
        sample_urls=["https://x.test/1", "https://x.test/2"],
    )

    run = await _service(llm)._tournament_proposal(
        discovery, Identity(domain="x.test", name="X")
    )
    report = run.report

    assert "quartos" not in run.verified_fields
    assert report["valor"]["verified"] is True
    assert report["quartos"]["verified"] is False
    assert "presenca" in report["quartos"]["gated_reason"]
