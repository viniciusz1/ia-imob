from __future__ import annotations

import pytest

from app.schemas import ExtractorProposal, Identity, OnboardingProposal
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


_HTML = (
    '<html><body>'
    '<span class="preco">R$ 500.000</span>'
    '<h1>Casa</h1>'
    '</body></html>'
)


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

    proposal, verified_fields = await _service(llm)._tournament_proposal(
        discovery, Identity(domain="x.test", name="Imob X")
    )

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

    _, verified = await _service(synth)._tournament_proposal(
        discovery, Identity(domain="x.test", name="X")
    )

    assert "valor" in verified
    assert any("valor" in failures for failures in synth.seen_failures)
