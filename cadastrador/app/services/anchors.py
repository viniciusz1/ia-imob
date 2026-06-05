from __future__ import annotations

from app.services.llm import AREA_PATTERN, PRICE_PATTERN, _extract_og_meta, _visible_text


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
    return set()
