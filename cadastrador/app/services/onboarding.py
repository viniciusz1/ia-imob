from __future__ import annotations

import time
from dataclasses import dataclass
from typing import AsyncIterator

import httpx
from starlette.requests import Request

from app.compat import ensure_imobscrapy_imports
from app.dependencies import Settings
from app.schemas import (
    AttemptRecord,
    ExtractorProposal,
    Identity,
    OnboardingProposal,
    derive_domain,
)
from app.services.discovery import (
    HttpFetcher,
    SitemapProbe,
    decide_execution_model,
    sample_urls,
)
from app.services.llm import LlmClient
from app.services.persistence import (
    deactivate_agency,
    duration_ms,
    persist_agency,
    record_attempt,
)
from app.services.sse import encode_event
from app.services.tournament import (
    CANDIDATE_STRATEGIES,
    generate_candidates,
    run_tournament,
    summarize_result,
)
from app.services.validation import ScrapyValidator
from app.services.verification import SelectorVerifier

ensure_imobscrapy_imports()
from imobiliarias.config.field_catalog import (  # noqa: E402
    BEST_EFFORT_EXTRACTOR_FIELDS,
    MANDATORY_EXTRACTOR_FIELDS,
)


PASS_THRESHOLD = 0.9
MAX_RETRIES_PER_FIELD = 3
TOURNAMENT_MAX_ROUNDS = 3
MAX_LLM_EVIDENCE_HTMLS = 3
DNS_ERROR_MARKERS = (
    "temporary failure in name resolution",
    "name or service not known",
    "nodename nor servname provided",
    "getaddrinfo failed",
)


@dataclass
class Discovery:
    homepage_html: str
    sample_htmls: list[str]
    execution_model: str
    llm_htmls: list[str] | None = None
    selected_sitemap_url: str | None = None
    sitemap_urls: list[str] | None = None
    sample_urls: list[str] | None = None


@dataclass
class TournamentProposalRun:
    proposal: OnboardingProposal
    verified_fields: set[str]
    report: dict
    progress_events: list[dict]


@dataclass(frozen=True)
class ErrorEvent:
    reason: str
    message: str
    detail: str | None = None

    def payload(self) -> dict[str, str]:
        payload = {"reason": self.reason, "message": self.message}
        if self.detail:
            payload["detail"] = self.detail
        return payload


def _exception_text(exc: BaseException) -> str:
    parts = [str(exc)]
    cause = exc.__cause__
    while cause is not None:
        parts.append(str(cause))
        cause = cause.__cause__
    return " ".join(parts)


def _is_dns_error(exc: BaseException) -> bool:
    text = _exception_text(exc).lower()
    return any(marker in text for marker in DNS_ERROR_MARKERS)


def _classify_error(exc: Exception, domain: str) -> ErrorEvent:
    detail = str(exc)
    if isinstance(exc, httpx.ConnectError):
        if _is_dns_error(exc):
            return ErrorEvent(
                reason="name_resolution_failed",
                message=(
                    f"Não foi possível resolver o domínio {domain!r}. "
                    "Verifique se a URL está correta e se o ambiente do Cadastrador tem DNS/internet."
                ),
                detail=detail,
            )
        return ErrorEvent(
            reason="connection_failed",
            message=(
                f"Não foi possível conectar ao domínio {domain!r}. "
                "Verifique se o site está online e acessível a partir do Cadastrador."
            ),
            detail=detail,
        )
    if isinstance(exc, httpx.TimeoutException):
        return ErrorEvent(
            reason="request_timeout",
            message=(
                f"O domínio {domain!r} não respondeu dentro do tempo limite. "
                "Tente novamente ou confirme se o site está respondendo normalmente."
            ),
            detail=detail,
        )
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        return ErrorEvent(
            reason="http_status_error",
            message=f"O site {domain!r} respondeu HTTP {status} ao baixar a página.",
            detail=detail,
        )
    return ErrorEvent(reason=type(exc).__name__, message=detail)


class OnboardingService:
    def __init__(
        self,
        *,
        fetcher: HttpFetcher,
        probe: SitemapProbe,
        llm: LlmClient,
        verifier: SelectorVerifier,
        validator: ScrapyValidator,
    ) -> None:
        self.fetcher = fetcher
        self.probe = probe
        self.llm = llm
        self.verifier = verifier
        self.validator = validator

    @classmethod
    def from_settings(cls, settings: Settings) -> "OnboardingService":
        fetcher = HttpFetcher()
        return cls(
            fetcher=fetcher,
            probe=SitemapProbe(fetcher),
            llm=LlmClient(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_base_url,
                model=settings.deepseek_model,
            ),
            verifier=SelectorVerifier(),
            validator=ScrapyValidator(
                scrapy_cwd=settings.scrapy_cwd,
                scrapy_executable=settings.resolved_scrapy_executable,
                enabled=settings.enable_scrapy,
            ),
        )

    async def stream_onboarding(
        self,
        *,
        url: str,
        conn,
        request: Request | None = None,
    ) -> AsyncIterator[bytes]:
        started_at = time.monotonic()
        domain = derive_domain(url)
        llm_rounds = 0

        try:
            yield encode_event("progress", {"step": "fetching"})
            discovery = await self._discover(url, domain)
            yield encode_event(
                "progress",
                {"step": "strategy_decided", "strategy": discovery.execution_model},
            )

            if discovery.execution_model == "unsupported":
                self._record_error(
                    conn,
                    url=url,
                    domain=domain,
                    started_at=started_at,
                    llm_rounds=llm_rounds,
                    outcome="rejected",
                    reason="unsupported_site",
                )
                yield encode_event("error", {"reason": "unsupported_site"})
                return

            identity = await self.llm.resolve_identity(url, discovery.homepage_html)
            yield encode_event(
                "progress",
                {"step": "identity_resolved", "name": identity.name, "domain": identity.domain},
            )

            tournament_report: dict = {}
            if discovery.execution_model == "sitemap":
                yield encode_event(
                    "progress",
                    {"step": "synthesizing_selectors", "mode": "tournament"},
                )
                tournament_run = await self._tournament_proposal(
                    discovery, identity
                )
                proposal = tournament_run.proposal
                verified_fields = tournament_run.verified_fields
                tournament_report = tournament_run.report
                llm_rounds += len(CANDIDATE_STRATEGIES)
                for event in tournament_run.progress_events:
                    yield encode_event("progress", event)
                yield encode_event(
                    "progress",
                    {
                        "step": "tournament_decided",
                        "winners": {
                            field: summary["winner"]
                            for field, summary in tournament_report.items()
                            if summary["winner"]
                        },
                    },
                )
                missing = [
                    field
                    for field in MANDATORY_EXTRACTOR_FIELDS
                    if field not in verified_fields
                ]
                if not verified_fields or missing:
                    self._record_error(
                        conn,
                        url=url,
                        domain=domain,
                        started_at=started_at,
                        llm_rounds=llm_rounds,
                        outcome="rejected",
                        reason="no_verified_extractors" if not verified_fields else "missing_mandatory_extractors",
                    )
                    yield encode_event(
                        "error",
                        {
                            "reason": "no_verified_extractors" if not verified_fields else "missing_mandatory_extractors",
                            "missing": missing,
                        },
                    )
                    return
            else:
                yield encode_event(
                    "progress",
                    {"step": "synthesizing_selectors", "mode": "batch"},
                )
                initial = await self.llm.synthesize(
                    htmls=discovery.sample_htmls,
                    fields=list(MANDATORY_EXTRACTOR_FIELDS),
                    prior_failures={},
                    execution_model=discovery.execution_model,
                )
                llm_rounds += 1
                if initial is None:
                    self._record_error(conn, url=url, domain=domain, started_at=started_at, llm_rounds=llm_rounds, outcome="error", reason="empty_initial_proposal")
                    yield encode_event("error", {"reason": "empty_initial_proposal"})
                    return

                verified, prior_failures = await self._verify_and_retry(
                    discovery=discovery,
                    initial=initial,
                    request=request,
                )
                llm_rounds += prior_failures.pop("__llm_rounds__", [0])[0]

                missing = [
                    field for field in MANDATORY_EXTRACTOR_FIELDS if field not in verified
                ]
                if len(verified) == 0 or missing:
                    self._record_error(
                        conn,
                        url=url,
                        domain=domain,
                        started_at=started_at,
                        llm_rounds=llm_rounds,
                        outcome="rejected",
                        reason="no_verified_extractors" if len(verified) == 0 else "missing_mandatory_extractors",
                    )
                    yield encode_event(
                        "error",
                        {
                            "reason": "no_verified_extractors" if len(verified) == 0 else "missing_mandatory_extractors",
                            "missing": missing,
                        },
                    )
                    return

                llm_rounds += await self._best_effort_extractors(discovery, verified, request)

                proposal = self._final_proposal(initial, identity, verified, discovery)

            yield encode_event("progress", {"step": "persisting"})
            persisted = persist_agency(conn, proposal, identity)
            conn.commit()

            yield encode_event("progress", {"step": "validating"})
            validation = await self.validator.run(
                persisted.agency_id,
                persisted.agency_type,
                persisted.name,
            )
            if validation.outcome == "saved_inactive":
                deactivate_agency(conn, persisted.agency_type, persisted.agency_id)

            report = {
                "sample_size": validation.sample_size,
                "fields": validation.fields,
                "issues": validation.issues,
                "strategy": discovery.execution_model,
                "extractors_inserted": persisted.extractors_inserted,
                "llm_rounds": llm_rounds,
                "tournament": tournament_report,
            }
            record_attempt(
                conn,
                AttemptRecord(
                    agency_type=persisted.agency_type,
                    agency_id=persisted.agency_id,
                    submitted_url=url,
                    derived_domain=domain,
                    outcome=validation.outcome,
                    report=report,
                    duration_ms=duration_ms(started_at),
                    llm_rounds=llm_rounds,
                ),
            )
            yield encode_event(
                "result",
                {
                    "outcome": validation.outcome,
                    "agency_id": persisted.agency_id,
                    "agency_type": persisted.agency_type,
                    "name": persisted.name,
                    "domain": persisted.domain,
                    "sitemap_url": proposal.sitemap_url,
                    "llm_rounds": llm_rounds,
                    "report": report,
                },
            )
        except Exception as exc:
            error = _classify_error(exc, domain)
            self._record_error(
                conn,
                url=url,
                domain=domain,
                started_at=started_at,
                llm_rounds=llm_rounds,
                outcome="error",
                reason=f"{error.reason}: {error.detail or error.message}",
            )
            yield encode_event("error", error.payload())

    async def _discover(self, url: str, domain: str) -> Discovery:
        homepage = await self.fetcher.fetch(url)
        sitemap_result = await self.probe.probe(domain)
        sitemap_urls = sitemap_result.property_urls if sitemap_result else None
        execution_model = decide_execution_model(homepage, sitemap_urls)
        if execution_model == "sitemap" and sitemap_urls:
            pairs = await self.fetcher.fetch_pairs(sample_urls(sitemap_urls))
            sample_htmls = [html for _, html in pairs]
            sample_page_urls = [page_url for page_url, _ in pairs]
        else:
            sample_htmls = []
            sample_page_urls = []
        if not sample_htmls:
            sample_htmls = [homepage]
            sample_page_urls = [url]
        llm_htmls = sample_htmls[:MAX_LLM_EVIDENCE_HTMLS] or [homepage]
        return Discovery(
            homepage_html=homepage,
            sample_htmls=sample_htmls,
            llm_htmls=llm_htmls,
            execution_model=execution_model,
            selected_sitemap_url=sitemap_result.selected_sitemap_url if sitemap_result else None,
            sitemap_urls=sitemap_urls,
            sample_urls=sample_page_urls,
        )

    async def _verify_and_retry(
        self,
        *,
        discovery: Discovery,
        initial: OnboardingProposal,
        request: Request | None,
    ) -> tuple[dict[str, ExtractorProposal], dict[str, list]]:
        verified: dict[str, ExtractorProposal] = {}
        prior_failures: dict[str, list] = {}
        llm_rounds = 0

        for extractor in initial.extractors:
            yieldable = {"step": "verifying", "field": extractor.field_name}
            del yieldable
            report = self.verifier.verify(extractor, discovery.sample_htmls)
            if report.pass_rate >= PASS_THRESHOLD:
                verified[extractor.field_name] = extractor
            else:
                prior_failures.setdefault(extractor.field_name, []).append(extractor.selector_value)

        for retry_round in range(1, MAX_RETRIES_PER_FIELD + 1):
            missing = [field for field in MANDATORY_EXTRACTOR_FIELDS if field not in verified]
            if not missing:
                break
            for field in missing:
                proposal = await self.llm.synthesize(
                    htmls=discovery.sample_htmls,
                    fields=[field],
                    prior_failures=prior_failures,
                    execution_model=discovery.execution_model,
                )
                llm_rounds += 1
                if proposal is None:
                    continue
                candidate = next(
                    (extractor for extractor in proposal.extractors if extractor.field_name == field),
                    None,
                )
                if candidate is None:
                    continue
                report = self.verifier.verify(candidate, discovery.sample_htmls)
                if report.pass_rate >= PASS_THRESHOLD:
                    verified[field] = candidate
                else:
                    prior_failures.setdefault(field, []).append(candidate.selector_value)

        prior_failures["__llm_rounds__"] = [llm_rounds]
        return verified, prior_failures

    async def _best_effort_extractors(
        self,
        discovery: Discovery,
        verified: dict[str, ExtractorProposal],
        request: Request | None,
    ) -> int:
        proposal = await self.llm.synthesize(
            htmls=discovery.sample_htmls,
            fields=list(BEST_EFFORT_EXTRACTOR_FIELDS),
            prior_failures={},
            execution_model=discovery.execution_model,
        )
        if proposal is None:
            return 1
        for extractor in proposal.extractors:
            if extractor.field_name not in BEST_EFFORT_EXTRACTOR_FIELDS:
                continue
            optional = extractor.model_copy(update={"is_optional": True})
            report = self.verifier.verify(optional, discovery.sample_htmls)
            if report.pass_rate >= PASS_THRESHOLD:
                verified[optional.field_name] = optional
        return 1

    async def _tournament_proposal(
        self,
        discovery: Discovery,
        identity: Identity,
    ) -> TournamentProposalRun:
        verified_chains: dict[str, list[ExtractorProposal]] = {}
        prior_failures: dict[str, list[str]] = {}
        results_by_field = {}
        progress_events: list[dict] = []
        fields = [*MANDATORY_EXTRACTOR_FIELDS, *BEST_EFFORT_EXTRACTOR_FIELDS]
        for round_index in range(TOURNAMENT_MAX_ROUNDS):
            round_number = round_index + 1
            progress_events.append({"step": "tournament_round", "round": round_number})
            candidates = await generate_candidates(
                self.llm,
                htmls=discovery.llm_htmls or discovery.sample_htmls[:MAX_LLM_EVIDENCE_HTMLS],
                fields=fields,
                prior_failures=prior_failures,
                execution_model=discovery.execution_model,
            )
            round_verified, round_results = run_tournament(
                candidates,
                discovery.sample_htmls,
                verifier=self.verifier,
                threshold=PASS_THRESHOLD,
                urls=discovery.sample_urls,
            )
            verified_chains.update(round_verified)
            results_by_field.update(round_results)
            for field, result in round_results.items():
                if result.winner is None:
                    continue
                summary = summarize_result(result)
                progress_events.append(
                    {
                        "step": "tournament_field_winner",
                        "round": round_number,
                        "field": field,
                        "winner": summary["winner"],
                        "acertividade": summary["acertividade"],
                        "verified": summary["verified"],
                    }
                )
            missing = [
                field
                for field in MANDATORY_EXTRACTOR_FIELDS
                if field not in verified_chains
            ]
            if not missing:
                break
            for field in missing:
                failed = [c.selector_value for c in candidates.get(field, [])]
                if failed:
                    prior_failures.setdefault(field, []).extend(failed)
            fields = missing
        extractors = [
            extractor for chain in verified_chains.values() for extractor in chain
        ]
        proposal = OnboardingProposal(
            strategy="sitemap",
            name=identity.name,
            extractors=extractors,
            sitemap_url=discovery.selected_sitemap_url,
            allowed_url_patterns=["/imovel/"],
        )
        ordered_fields = [
            *(field for field in MANDATORY_EXTRACTOR_FIELDS if field in results_by_field),
            *(field for field in results_by_field if field not in MANDATORY_EXTRACTOR_FIELDS),
        ]
        report = {field: summarize_result(results_by_field[field]) for field in ordered_fields}
        return TournamentProposalRun(
            proposal=proposal,
            verified_fields=set(verified_chains),
            report=report,
            progress_events=progress_events,
        )

    def _final_proposal(
        self,
        initial: OnboardingProposal,
        identity: Identity,
        verified: dict[str, ExtractorProposal],
        discovery: Discovery,
    ) -> OnboardingProposal:
        data = initial.model_dump()
        data["name"] = identity.name
        data["strategy"] = discovery.execution_model
        data["extractors"] = list(verified.values())
        if discovery.execution_model == "sitemap":
            data["sitemap_url"] = discovery.selected_sitemap_url or initial.sitemap_url
            data["allowed_url_patterns"] = initial.allowed_url_patterns or ["/imovel/"]
        else:
            data["url"] = initial.url or data.get("url")
        return OnboardingProposal.model_validate(data)

    def _record_error(
        self,
        conn,
        *,
        url: str,
        domain: str,
        started_at: float,
        llm_rounds: int,
        outcome: str,
        reason: str,
    ) -> None:
        record_attempt(
            conn,
            AttemptRecord(
                agency_type="sitemap",
                agency_id=None,
                submitted_url=url,
                derived_domain=domain,
                outcome=outcome,  # type: ignore[arg-type]
                report={"reason": reason},
                duration_ms=duration_ms(started_at),
                llm_rounds=llm_rounds,
            ),
        )
