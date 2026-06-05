from __future__ import annotations

import json
import os
import re
import unicodedata
from html import unescape
from typing import Any

from parsel import Selector

try:
    from langchain_core.exceptions import OutputParserException
except ModuleNotFoundError:
    class OutputParserException(Exception):
        pass

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
TAG_PATTERN = re.compile(r"<[^>]+>")
META_PATTERN = re.compile(r"<meta\b[^>]*>", re.IGNORECASE)
ATTR_PATTERN = re.compile(r"([a-zA-Z_:.-]+)\s*=\s*([\"'])(.*?)\2", re.DOTALL)
PRICE_PATTERN = re.compile(r"R\$\s*\d[\d.,]*")
AREA_PATTERN = re.compile(
    r"\d[\d.,]*\s*m(?:\N{SUPERSCRIPT TWO}|2)?"
    r"(?:\s+de\s+[áa]rea\s+\w+)?\b",
    re.IGNORECASE,
)
FEATURE_VALUE_PATTERN = re.compile(r"\d[\d.,]*")
FEATURE_LABEL_ALIASES = {
    "quartos": ("quarto", "dormitorio", "dorm"),
    "suites": ("suite",),
    "banheiros": ("banheiro", "wc"),
    "vagas": ("vaga", "garagem"),
    "andar": ("andar", "pavimento"),
}


SYSTEM_PROMPT = """You write robust XPath-first extractors for Brazilian real-estate websites.
Return only fields requested by the structured schema. Prefer XPath, use CSS only when clearer,
and use jsonld/og only when structured data is more reliable.
For source_type=og, selector_value is only the Open Graph suffix: selector_value=image,
selector_value=description, or selector_value=title; never selector_value=og:image.
When the HTML evidence shows that a value lives in a specific element (e.g.
price-like text in <h6 class="preco-imovel">), anchor the selector to that element's
tag and class instead of guessing wrappers like strong; never invent tags or classes
that are not present in the evidence or HTML samples.
For count-like fields such as quartos, suites, banheiros, vagas, and andar,
prefer feature-like pairs from HTML evidence. When a numeric value and a label such
as "Quarto(s)" are sibling elements or live together in text like "4 quarto(s)",
anchor the XPath to that container class and label text, then select the child element
that contains the numeric value. Match labels case-insensitively and handle singular,
plural, and accent variants. Never use listing-card wrappers unless the evidence
actually contains them.
If a feature-like pair includes suggested_xpath, prefer that XPath shape. Do not select
/text() from the container when the value is in a child element, and do not add a
Pipeline when the XPath already selects the numeric sibling.
For count-like fields, value 0 is valid. If the evidence marks hidden_zero=true,
do not filter out that hidden container with not(contains(@class,'hide')); extracting
0 is better than returning empty for that sample.
Use a DSL Pipeline when a reliable source contains compound text that must be split,
trimmed, replaced, or templated into the requested field.
Valid DSL Pipeline operations include strip, clean_text, split:<delimiter>:<index>,
replace:<old>><new>, regex:<pattern>, regex_group:<pattern>:<group>, and
template:<template with {value}>. Example: split:, :1 | split: - :0 | strip.
For output_type=number, do not convert Brazilian decimal commas with replace:,>.;
the loader already handles values like "295,00", "152,51 m", and "R$ 1.200,00".
A number pipeline that converts comma to dot before loader treatment can turn
"295,00" into 29500, which is wrong.
Prefer split pipelines over regex for title/h1 location patterns. For titles like
"Casa para Venda em Jaraguá do Sul / SC no bairro Vila Lalau", cidade should isolate
the city only (e.g. split: em :1 | split: / :0 | strip) and bairro should isolate
the neighborhood only (e.g. split: no bairro :1 | strip). Do not leave prefixes
like "em" or suffixes like "/ SC" in cidade/bairro.
If regex is needed in a Pipeline, prefer regex_group and keep the pattern simple.
Avoid literal "|" alternation and non-capturing groups; use ordinary capturing
groups instead, because pipelines are pipe-delimited.
For area, prefer a non-zero feature value when available. If visible feature blocks
show "0,00 m²" but og:description/meta description or body description contains a
real area such as "152,51 m de área construída" or "200m de área privativa", extract
that description value with a precise regex_group and numeric output instead of the
zero feature block. When both patterns appear across samples, return two area
extractors: priority 1 for a non-zero m² feature selector, and priority 2 for
og:description or description text with a pipeline like
regex_group:(\\d+[.,]?\\d*)\\s*m:1. Do not use replace:,>. for area.
For sitemap allowed_url_patterns, use path fragments like /imovel/ rather than full URLs.
Mandatory fields are tipo, valor, bairro, cidade, link_imovel.
All fields other than tipo, valor, bairro, cidade, and link_imovel are best-effort
optional fields; set is_optional=true for them even when the selector works in many
samples.
The tipo field must resolve to a single canonical Brazilian property-type noun such as
Apartamento, Casa, Sobrado, Cobertura, Kitnet, Terreno, Sala Comercial, Loja, Galpão or
Chácara, never a full marketing title. When the chosen source mixes the type with
transaction or location text (e.g. og:title "Apartamento para alugar, Centro - Jaraguá do
Sul/SC"), add a Pipeline that isolates the leading type and drops everything from the
transaction word onward, e.g. split:,:0 | split: para :0 | strip. Keep multi-word types
like "Sala Comercial" intact; do not reduce them to a single word.
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


def _locate_element(selector: Selector, value: str) -> str | None:
    """Return the opening tag of the deepest element whose text contains value.

    Gives the LLM the actual DOM anchor (tag + class/id) for a price/area value
    so it can write a selector that matches, instead of guessing a structure
    that may live far outside the truncated HTML context window.
    """
    try:
        nodes = selector.xpath(
            "(//*[contains(normalize-space(string(.)), $v)]"
            "[not(.//*[contains(normalize-space(string(.)), $v)])])[1]",
            v=value,
        )
    except Exception:
        return None
    if not nodes:
        return None
    node = nodes[0]
    tag = getattr(node.root, "tag", None)
    if not isinstance(tag, str):
        return None
    parts = [f"<{tag}"]
    element_id = node.attrib.get("id")
    element_class = node.attrib.get("class")
    if element_id:
        parts.append(f' id="{_shorten(element_id, 80)}"')
    if element_class:
        parts.append(f' class="{_shorten(element_class, 120)}"')
    parts.append(">")
    return "".join(parts)


def _element_opening_tag(node) -> str | None:
    tag = getattr(node.root, "tag", None)
    if not isinstance(tag, str):
        return None
    parts = [f"<{tag}"]
    element_id = node.attrib.get("id")
    element_class = node.attrib.get("class")
    if element_id:
        parts.append(f' id="{_shorten(element_id, 80)}"')
    if element_class:
        parts.append(f' class="{_shorten(element_class, 120)}"')
    parts.append(">")
    return "".join(parts)


def _normalized_label(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"\s+", " ", text).strip().lower()
    return text


def _feature_field(label: str) -> str | None:
    normalized = _normalized_label(label)
    for field, aliases in FEATURE_LABEL_ALIASES.items():
        if any(alias in normalized for alias in aliases):
            return field
    return None


def _first_numeric_value(values: list[str]) -> str | None:
    for value in values:
        match = FEATURE_VALUE_PATTERN.search(re.sub(r"\s+", " ", value))
        if match:
            return match.group(0)
    return None


def _stable_class_token(node) -> str | None:
    classes = (node.attrib.get("class") or "").split()
    for class_name in classes:
        if class_name != "hide":
            return class_name
    return classes[0] if classes else None


def _label_xpath_keyword(label: str) -> str:
    text = re.sub(r"^\s*\d[\d.,]*\s*", "", label.strip())
    return re.split(r"[\s(]", text, maxsplit=1)[0]


def _feature_suggested_xpath(container, label_node, label: str) -> str | None:
    tag = getattr(container.root, "tag", None)
    if not isinstance(tag, str):
        return None
    class_name = _stable_class_token(container)
    label_tag = getattr(label_node.root, "tag", None)
    if not isinstance(label_tag, str):
        return None
    keyword = _label_xpath_keyword(label)
    if not class_name or not keyword:
        return None
    return (
        f"//{tag}[contains(@class,'{class_name}')]"
        f"[.//{label_tag}[contains(normalize-space(.),'{keyword}')]]/{label_tag}[1]"
    )


def _feature_like_pairs(selector: Selector) -> list[str]:
    pairs: list[str] = []
    seen: set[tuple[str, str, str]] = set()
    for label_node in selector.xpath("//*[normalize-space(string()) and not(*)]"):
        label = re.sub(r"\s+", " ", label_node.xpath("normalize-space(string())").get("") or "").strip()
        if len(label) > 80:
            continue
        field = _feature_field(label)
        if field is None:
            continue

        container = label_node.xpath("parent::*")
        if not container:
            continue

        value = _first_numeric_value(
            [
                *[
                    node.xpath("normalize-space(string())").get("")
                    for node in label_node.xpath("preceding-sibling::*[normalize-space(string())]")[::-1]
                ],
                *[
                    node.xpath("normalize-space(string())").get("")
                    for node in label_node.xpath("following-sibling::*[normalize-space(string())]")
                ],
            ]
        )
        if value is None:
            value = _first_numeric_value(
                [
                    node.xpath("normalize-space(string())").get("")
                    for node in container[0].xpath("./*[normalize-space(string())]")
                ]
            )
        if value is None:
            continue

        location = _element_opening_tag(container[0])
        key = (field, value, label)
        if location is None or key in seen:
            continue
        seen.add(key)
        hidden_zero = "hide" in (container[0].attrib.get("class") or "").split() and value == "0"
        hidden_note = " hidden_zero=true" if hidden_zero else ""
        suggested_xpath = _feature_suggested_xpath(container[0], label_node, label)
        xpath_note = f"; suggested_xpath={suggested_xpath}" if suggested_xpath else ""
        pairs.append(
            f"feature-like pair: field={field} value={value} label={_shorten(label, 80)}"
            f"{hidden_note} (in {location}{xpath_note})"
        )
        if len(pairs) >= 12:
            break
    return pairs


def _html_evidence(htmls: list[str]) -> str:
    samples: list[str] = []
    for index, html in enumerate(htmls[:3], 1):
        text = _visible_text(html)
        selector = Selector(text=html)
        lines = [f"--- SAMPLE {index} EVIDENCE ---"]
        title = _extract_title(html)
        h1 = _extract_h1(html)
        if title:
            lines.append(f"title: {_shorten(title)}")
        if h1:
            lines.append(f"h1: {_shorten(h1)}")
        og_meta = _extract_og_meta(html)
        for property_name, content in og_meta.items():
            lines.append(f"og:{property_name}: {_shorten(content)}")
        for price in _unique(PRICE_PATTERN.findall(text))[:5]:
            location = _locate_element(selector, price)
            lines.append(f"price-like text: {price}" + (f" (in {location})" if location else ""))
        area_source = " ".join([text, *og_meta.values()])
        for area in _unique(AREA_PATTERN.findall(area_source))[:8]:
            location = _locate_element(selector, area)
            lines.append(f"area-like text: {area}" + (f" (in {location})" if location else ""))
        lines.extend(_feature_like_pairs(selector))
        samples.append("\n".join(lines))
    return "\n\n".join(samples)


def _extract_og_meta(html: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for tag in META_PATTERN.findall(html):
        attrs = {
            match.group(1).lower(): unescape(match.group(3)).strip()
            for match in ATTR_PATTERN.finditer(tag)
        }
        property_name = attrs.get("property") or attrs.get("name")
        content = attrs.get("content")
        if not property_name or not content:
            continue
        property_name = property_name.lower()
        if property_name.startswith("og:"):
            values[property_name.split(":", 1)[1]] = content
    return values


def _visible_text(html: str) -> str:
    cleaned = STYLE_PATTERN.sub("", html)
    cleaned = SCRIPT_PATTERN.sub("", cleaned)
    return re.sub(r"\s+", " ", TAG_PATTERN.sub(" ", cleaned)).strip()


def _shorten(value: str, limit: int = 220) -> str:
    text = re.sub(r"\s+", " ", value).strip()
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "..."


def _unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        result.append(value)
    return result


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


def _parse_proposal_text(text: str) -> OnboardingProposal | None:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return OnboardingProposal.model_validate_json(cleaned)
    except ValueError:
        pass

    start = cleaned.find("{")
    if start < 0:
        return None
    depth = 0
    in_string = False
    escaped = False
    for offset, char in enumerate(cleaned[start:], start):
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
                    return OnboardingProposal.model_validate_json(cleaned[start : offset + 1])
                except ValueError:
                    return None
    return None


def build_synthesis_messages(
    *,
    htmls: list[str],
    fields: list[str],
    prior_failures: dict[str, list[str]],
    execution_model: str,
) -> list[dict[str, str]]:
    prior = json.dumps(prior_failures, ensure_ascii=False)
    user_prompt = (
        f"Execution model: {execution_model}\n"
        f"Fields: {', '.join(fields)}\n"
        f"Previously failed selectors by field: {prior}\n\n"
        "Return a single JSON object matching this schema. Do not wrap it in markdown. "
        "Use only these top-level keys when applicable: strategy, name, extractors, "
        "sitemap_url, allowed_url_patterns, url, url_pagination_template, "
        "total_pages_selector_type, total_pages_selector_value, total_pages_formula, "
        "cards_to_iterate_selector_type, cards_to_iterate_selector_value. "
        "Each extractor must include field_name, source_type, selector_value, output_type, "
        "priority, and is_optional. Include pipeline when the raw selector needs a DSL "
        "Pipeline such as split, strip, replace, or template.\n\n"
        f"JSON schema:\n{json.dumps(OnboardingProposal.model_json_schema(), ensure_ascii=False)}\n\n"
        f"HTML evidence:\n{_html_evidence(htmls)}\n\n"
        f"HTML samples:\n{_html_context(htmls)}"
    )
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


class LlmClient:
    def __init__(self, *, api_key: str | None, base_url: str, model: str) -> None:
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.last_messages: list[dict[str, str]] = []

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
        chat = self._chat()
        self.last_messages = build_synthesis_messages(
            htmls=htmls,
            fields=fields,
            prior_failures=prior_failures,
            execution_model=execution_model,
        )
        try:
            response = await chat.ainvoke(self.last_messages)
            return _parse_proposal_text(str(getattr(response, "content", "")))
        except OutputParserException as exc:
            return _recover_proposal(exc)
