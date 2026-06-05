from __future__ import annotations

import json
import os
import re
from typing import Any

from langchain_core.exceptions import OutputParserException

from app.schemas import (
    Identity,
    OnboardingProposal,
    derive_domain,
    fallback_name_from_domain,
)


STYLE_PATTERN = re.compile(r"<style\b[^>]*>.*?</style>", re.IGNORECASE | re.DOTALL)
SCRIPT_PATTERN = re.compile(
    r"<script\b(?![^>]*type=[\"']application/ld\+json[\"'])[^>]*>.*?</script>",
    re.IGNORECASE | re.DOTALL,
)


SYSTEM_PROMPT = """You write robust XPath-first extractors for Brazilian real-estate websites.
Return only fields requested by the structured schema. Prefer XPath, use CSS only when clearer,
and use jsonld/og only when structured data is more reliable. Do not invent DSL pipelines.
For sitemap allowed_url_patterns, use path fragments like /imovel/ rather than full URLs.
Mandatory fields are tipo, valor, bairro, cidade, link_imovel.
"""


IDENTITY_SYSTEM_PROMPT = """You name Brazilian real-estate websites concisely.
Return a single short imobiliária display name, without JSON or explanation."""


def _extract_title(html: str) -> str:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    return re.sub(r"\s+", " ", match.group(1)).strip() if match else ""


def _extract_h1(html: str) -> str:
    match = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.IGNORECASE | re.DOTALL)
    return re.sub(r"<[^>]+>", "", match.group(1)).strip() if match else ""


def _extract_og_site_name(html: str) -> str:
    match = re.search(
        r'<meta[^>]+property=["\']og:site_name["\'][^>]+content=["\']([^"\']*)["\']',
        html,
        re.IGNORECASE,
    )
    return match.group(1).strip() if match else ""


def _html_context(htmls: list[str]) -> str:
    parts: list[str] = []
    for index, html in enumerate(htmls[:3], 1):
        cleaned = STYLE_PATTERN.sub("", html)
        cleaned = SCRIPT_PATTERN.sub("", cleaned)
        parts.append(f"--- SAMPLE {index} ---\n{cleaned[:8000]}")
    return "\n\n".join(parts)


def _recover_proposal(exc: OutputParserException) -> OnboardingProposal | None:
    text = str(exc)
    marker = "Function OnboardingProposal arguments:"
    if marker in text:
        text = text.split(marker, 1)[1]
    start = text.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    for offset, char in enumerate(text[start:], start):
        if escaped:
            escaped = False
            continue
        if char == "\\":
            escaped = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                try:
                    return OnboardingProposal.model_validate_json(text[start : offset + 1])
                except ValueError:
                    return None
    return None


class LlmClient:
    def __init__(self, *, api_key: str | None, base_url: str, model: str) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.model = model

    def _require_key(self) -> str:
        key = self.api_key or os.environ.get("DEEPSEEK_API_KEY")
        if not key:
            raise RuntimeError("DEEPSEEK_API_KEY is required for real onboarding")
        return key

    def _chat(self, *, temperature: float = 0.1, max_tokens: int | None = None):
        from langchain_openai import ChatOpenAI

        kwargs: dict[str, Any] = {
            "api_key": self._require_key(),
            "base_url": self.base_url,
            "model": self.model,
            "temperature": temperature,
        }
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens
        return ChatOpenAI(**kwargs)

    async def resolve_identity(self, url: str, html: str) -> Identity:
        domain = derive_domain(url)
        chat = self._chat(temperature=0.2, max_tokens=64)
        response = await chat.ainvoke(
            [
                {"role": "system", "content": IDENTITY_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"<title>: {_extract_title(html) or '(empty)'}\n"
                        f"og:site_name: {_extract_og_site_name(html) or '(empty)'}\n"
                        f"h1: {_extract_h1(html) or '(empty)'}"
                    ),
                },
            ]
        )
        content = getattr(response, "content", "")
        name = str(content).strip().strip("\"'") or fallback_name_from_domain(domain)
        return Identity(domain=domain, name=name)

    async def synthesize(
        self,
        *,
        htmls: list[str],
        fields: list[str],
        prior_failures: dict[str, list[str]],
        execution_model: str,
    ) -> OnboardingProposal | None:
        structured = self._chat().with_structured_output(OnboardingProposal)
        prior = json.dumps(prior_failures, ensure_ascii=False)
        user_prompt = (
            f"Execution model: {execution_model}\n"
            f"Fields: {', '.join(fields)}\n"
            f"Previously failed selectors by field: {prior}\n\n"
            f"HTML samples:\n{_html_context(htmls)}"
        )
        try:
            return await structured.ainvoke(
                [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ]
            )
        except OutputParserException as exc:
            return _recover_proposal(exc)

