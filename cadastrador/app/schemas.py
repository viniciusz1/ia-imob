from __future__ import annotations

import re
from typing import Literal
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator

from app.compat import ensure_imobscrapy_imports

ensure_imobscrapy_imports()
from imobiliarias.config.field_catalog import BEST_EFFORT_EXTRACTOR_FIELDS  # noqa: E402


FieldName = Literal[
    "tipo",
    "valor",
    "bairro",
    "cidade",
    "link_imovel",
    "imagem",
    "descricao",
    "quartos",
    "suites",
    "banheiros",
    "vagas",
    "area",
    "aceita_permuta",
    "financiamento",
    "piscina",
    "churrasqueira",
    "academia",
    "salao_festas",
    "playground",
    "sacada",
    "mobiliado",
    "ar_condicionado",
    "lavanderia",
    "escritorio",
    "closet",
    "elevador",
    "portaria_24h",
    "andar",
    "posicao_solar",
    "ano_construcao",
]
SourceType = Literal["xpath", "css", "og", "jsonld", "literal"]
OutputType = Literal["text", "number", "boolean", "image_url", "link_url"]
AgencyType = Literal["sitemap", "wsm"]
Outcome = Literal["active", "saved_inactive", "rejected", "error"]
ExecutionModel = Literal["sitemap", "wsm"]

OPTIONAL_FIELD_NAMES = tuple(
    field for field in BEST_EFFORT_EXTRACTOR_FIELDS if field != "imagem"
)


def normalize_http_url(value: str) -> str:
    url = value.strip()
    if not url:
        raise ValueError("url is required")
    if url.startswith("//"):
        url = "https:" + url
    if "://" not in url:
        url = "https://" + url
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("url must use http or https")
    if not parsed.netloc:
        raise ValueError("url must include a host")
    return url


def derive_domain(url: str) -> str:
    normalized = normalize_http_url(url)
    netloc = urlparse(normalized).netloc.lower()
    return netloc[4:] if netloc.startswith("www.") else netloc


def fallback_name_from_domain(domain: str) -> str:
    first = domain.split(".", 1)[0]
    return re.sub(r"[-_]+", " ", first).strip().title() or domain


class OnboardRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def _normalize_url(cls, value: str) -> str:
        return normalize_http_url(value)


class DebugSynthesizeRequest(BaseModel):
    url: str
    strategy: ExecutionModel = "sitemap"
    field: str | None = None

    @field_validator("url")
    @classmethod
    def _normalize_url(cls, value: str) -> str:
        return normalize_http_url(value)


class DebugIdentityRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def _normalize_url(cls, value: str) -> str:
        return normalize_http_url(value)


class ExistingAgency(BaseModel):
    agency_type: AgencyType
    agency_id: int
    name: str
    is_active: bool


class Identity(BaseModel):
    domain: str
    name: str


class ExtractorProposal(BaseModel):
    field_name: FieldName
    source_type: SourceType
    selector_value: str
    selector_index: int | None = None
    selector_join: bool = False
    pipeline: str | None = None
    output_type: OutputType = "text"
    rationale: str | None = None
    priority: int = 1
    is_optional: bool = False


class OnboardingProposal(BaseModel):
    strategy: ExecutionModel
    name: str
    extractors: list[ExtractorProposal]
    sitemap_url: str | None = None
    allowed_url_patterns: list[str] | None = None
    url: str | None = None
    url_pagination_template: str | None = None
    total_pages_selector_type: SourceType | None = None
    total_pages_selector_value: str | None = None
    total_pages_formula: str | None = None
    cards_to_iterate_selector_type: SourceType | None = None
    cards_to_iterate_selector_value: str | None = None


class VerificationReport(BaseModel):
    field_name: str
    filled: int
    sample_size: int
    pass_rate: float
    sample_issues: list[str] = Field(default_factory=list)


class ValidationReport(BaseModel):
    outcome: Outcome
    sample_size: int = 0
    fields: dict[str, dict] = Field(default_factory=dict)
    issues: list[str] = Field(default_factory=list)


class PersistResult(BaseModel):
    agency_type: AgencyType
    agency_id: int
    name: str
    domain: str
    is_active: bool
    replaced_existing: bool = False
    extractors_inserted: int = 0


class AttemptRecord(BaseModel):
    agency_type: AgencyType
    agency_id: int | None
    submitted_url: str
    derived_domain: str | None
    outcome: Outcome
    report: dict
    duration_ms: int | None = None
    llm_rounds: int | None = None
    submitted_by: str | None = None

