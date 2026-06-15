from __future__ import annotations

import json
import re
import time
from hashlib import sha256
from dataclasses import dataclass
from collections.abc import Sequence

from app.compat import ensure_imobscrapy_imports
from app.schemas import (
    AttemptRecord,
    ExistingAgency,
    Identity,
    OnboardingProposal,
    PersistResult,
)

ensure_imobscrapy_imports()
from imobiliarias.config.field_catalog import default_pipeline, loader_output_type  # noqa: E402


AGENCY_TABLES = {
    "sitemap": ("sitemap_agencies", "sitemap_url", "sitemap"),
    "wsm": ("wsm_agencies", "url", "imobscrapy"),
}

EXTRACTOR_COLUMNS = [
    "agency_type",
    "agency_id",
    "field_name",
    "priority",
    "source_type",
    "selector_value",
    "selector_index",
    "selector_params",
    "selector_join",
    "pipeline",
    "output_type",
    "is_optional",
]


@dataclass
class ActiveAgencyConflict(Exception):
    existing_agency_id: int
    existing_agency_type: str
    name: str
    domain: str


def execution_spec(agency_type: str) -> tuple[str, str, str]:
    if agency_type not in AGENCY_TABLES:
        raise ValueError(f"unsupported execution model: {agency_type}")
    return AGENCY_TABLES[agency_type]


def lookup_by_domain(conn, domain: str) -> ExistingAgency | None:
    with conn.cursor() as cur:
        for agency_type in ("sitemap", "wsm"):
            table, _, _ = execution_spec(agency_type)
            cur.execute(f"SELECT id, name, is_active FROM {table} WHERE domain = %s", (domain,))
            row = cur.fetchone()
            if row:
                return ExistingAgency(
                    agency_type=agency_type, agency_id=row[0], name=row[1], is_active=row[2]
                )
    return None


def find_agency_source(conn, agency_id: int) -> tuple[str, str, str] | None:
    with conn.cursor() as cur:
        for agency_type in ("sitemap", "wsm"):
            table, url_column, _ = execution_spec(agency_type)
            cur.execute(f"SELECT domain, {url_column} FROM {table} WHERE id = %s", (agency_id,))
            row = cur.fetchone()
            if row:
                return agency_type, row[0], row[1]
    return None


def deactivate_agency(conn, agency_type: str, agency_id: int) -> None:
    table, _, _ = execution_spec(agency_type)
    with conn.cursor() as cur:
        cur.execute(f"UPDATE {table} SET is_active = false WHERE id = %s", (agency_id,))


def delete_agency(conn, agency_type: str, agency_id: int) -> None:
    table, _, _ = execution_spec(agency_type)
    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM agency_field_extractors WHERE agency_type = %s AND agency_id = %s",
            (agency_type, agency_id),
        )
        cur.execute(f"DELETE FROM {table} WHERE id = %s", (agency_id,))


def _lookup_raw(cur, domain: str):
    for agency_type in ("sitemap", "wsm"):
        table, _, _ = execution_spec(agency_type)
        cur.execute(f"SELECT id, name, is_active FROM {table} WHERE domain = %s", (domain,))
        row = cur.fetchone()
        if row:
            return agency_type, row[0], row[1], row[2]
    return None


def _name_taken(cur, name: str, agency_type: str) -> bool:
    table, _, _ = execution_spec(agency_type)
    cur.execute(f"SELECT 1 FROM {table} WHERE name = %s LIMIT 1", (name,))
    return cur.fetchone() is not None


def _normalize_allowed_patterns(domain: str, patterns: list[str] | None) -> list[str]:
    normalized: list[str] = []
    prefixes = (domain, re.escape(domain), f"www.{domain}", re.escape(f"www.{domain}"))
    for pattern in patterns or []:
        candidate = re.sub(r"^https?://", "", pattern.strip(), flags=re.IGNORECASE)
        for prefix in prefixes:
            if candidate.startswith(prefix):
                candidate = candidate[len(prefix) :]
                break
        if candidate:
            normalized.append(candidate)
    return normalized


def _insert_agency(cur, proposal: OnboardingProposal, identity: Identity, name: str) -> int:
    if proposal.strategy == "sitemap":
        patterns = _normalize_allowed_patterns(identity.domain, proposal.allowed_url_patterns)
        cur.execute(
            """
            INSERT INTO sitemap_agencies
                (name, domain, sitemap_url, allowed_url_patterns, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, true, NOW(), NOW())
            RETURNING id
            """,
            (
                name,
                identity.domain,
                proposal.sitemap_url or f"https://{identity.domain}/sitemap.xml",
                ", ".join(patterns) or None,
            ),
        )
    else:
        cur.execute(
            """
            INSERT INTO wsm_agencies
                (name, domain, url, url_pagination_template,
                 total_pages_selector_type, total_pages_selector_value,
                 total_pages_formula, cards_to_iterate_selector_type,
                 cards_to_iterate_selector_value, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, true, NOW(), NOW())
            RETURNING id
            """,
            (
                name,
                identity.domain,
                proposal.url or f"https://{identity.domain}",
                proposal.url_pagination_template or "",
                proposal.total_pages_selector_type or "xpath",
                proposal.total_pages_selector_value or "",
                proposal.total_pages_formula,
                proposal.cards_to_iterate_selector_type or "xpath",
                proposal.cards_to_iterate_selector_value or "",
            ),
        )
    return cur.fetchone()[0]


def _insert_extractors(cur, proposal: OnboardingProposal, agency_id: int) -> int:
    rows = [
        {
            "agency_type": proposal.strategy,
            "agency_id": agency_id,
            "field_name": extractor.field_name,
            "priority": extractor.priority,
            "source_type": extractor.source_type,
            "selector_value": extractor.selector_value,
            "selector_index": extractor.selector_index,
            "selector_params": None,
            "selector_join": extractor.selector_join,
            "pipeline": default_pipeline(
                field_name=extractor.field_name,
                is_optional=extractor.is_optional,
                source_type=extractor.source_type,
                explicit_pipeline=extractor.pipeline,
            ),
            "output_type": loader_output_type(extractor.field_name, extractor.output_type),
            "is_optional": extractor.is_optional,
        }
        for extractor in proposal.extractors
    ]
    if not rows:
        return 0
    placeholders = ", ".join(f"%({column})s" for column in EXTRACTOR_COLUMNS)
    cur.executemany(
        f"""
        INSERT INTO agency_field_extractors
            ({", ".join(EXTRACTOR_COLUMNS)}, created_at, updated_at)
        VALUES ({placeholders}, NOW(), NOW())
        """,
        rows,
    )
    return len(rows)


def persist_agency(conn, proposal: OnboardingProposal, identity: Identity) -> PersistResult:
    with conn.cursor() as cur:
        existing = _lookup_raw(cur, identity.domain)
        replaced = False
        if existing:
            existing_type, existing_id, existing_name, existing_active = existing
            if existing_active:
                raise ActiveAgencyConflict(existing_id, existing_type, existing_name, identity.domain)
            delete_agency(conn, existing_type, existing_id)
            replaced = True

        name = identity.name
        if _name_taken(cur, name, proposal.strategy):
            name = f"{identity.name} ({identity.domain})"
        agency_id = _insert_agency(cur, proposal, identity, name)
        extractors_inserted = _insert_extractors(cur, proposal, agency_id)

    return PersistResult(
        agency_type=proposal.strategy,
        agency_id=agency_id,
        name=name,
        domain=identity.domain,
        is_active=True,
        replaced_existing=replaced,
        extractors_inserted=extractors_inserted,
    )


def record_attempt(conn, attempt: AttemptRecord) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO agency_onboarding_attempts
                (agency_type, agency_id, submitted_url, derived_domain, outcome,
                 report, duration_ms, llm_rounds, submitted_by, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s, NOW(), NOW())
            RETURNING id
            """,
            (
                attempt.agency_type,
                attempt.agency_id,
                attempt.submitted_url,
                attempt.derived_domain,
                attempt.outcome,
                json.dumps(attempt.report),
                attempt.duration_ms,
                attempt.llm_rounds,
                attempt.submitted_by,
            ),
        )
        row = cur.fetchone()
        return int(row[0]) if row else 0


def record_evidence(
    conn,
    *,
    attempt_id: int,
    samples: Sequence[tuple[str, str]],
) -> None:
    with conn.cursor() as cur:
        for sample_index, (url, html) in enumerate(samples):
            cur.execute(
                """
                INSERT INTO agency_onboarding_evidence
                    (agency_onboarding_attempt_id, sample_index, url, content_hash,
                     html, captured_at, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), NOW())
                """,
                (
                    attempt_id,
                    sample_index,
                    url,
                    sha256(html.encode("utf-8")).hexdigest(),
                    html,
                ),
            )


def duration_ms(started_at: float) -> int:
    return int((time.monotonic() - started_at) * 1000)
