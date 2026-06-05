from __future__ import annotations

import re

from parsel import Selector

from app.services.llm import (
    AREA_PATTERN,
    FEATURE_LABEL_ALIASES,
    PRICE_PATTERN,
    _extract_og_meta,
    _feature_like_pairs,
    _visible_text,
)

_FEATURE_PAIR_RE = re.compile(r"field=(\w+) value=(\S+)")


def _feature_anchor(field_name: str, html: str) -> set[str]:
    values: set[str] = set()
    for line in _feature_like_pairs(Selector(text=html)):
        match = _FEATURE_PAIR_RE.search(line)
        if match and match.group(1) == field_name:
            values.add(match.group(2))
    return values


def anchor_values(field_name: str, html: str, *, url: str | None = None) -> set[str]:
    """Heuristic Âncora de Evidência: candidate truth values detected from the page.

    These are the closest proxy to ground truth available during live onboarding,
    used as a reinforced voter when judging a Torneio.
    """
    if field_name == "link_imovel":
        return {url} if url else set()
    if field_name == "valor":
        return set(PRICE_PATTERN.findall(_visible_text(html)))
    if field_name == "area":
        text = " ".join([_visible_text(html), *_extract_og_meta(html).values()])
        return set(AREA_PATTERN.findall(text))
    if field_name in FEATURE_LABEL_ALIASES:
        return _feature_anchor(field_name, html)
    return set()
