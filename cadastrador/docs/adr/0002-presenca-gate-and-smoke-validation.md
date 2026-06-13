---
status: accepted
---

# Presença gates optional fields; post-persist validation is a smoke test

Amends ADR 0001. Two of its gates conflated unrelated signals with "extraction is
wrong", silently dropping good extractors and deleting Torneio-approved agencies:
coverage-over-all-pages punished optional fields legitimately absent from part of the
site (`vagas` on 60% of pages can never reach 0.9 fill), and a 90s Scrapy watchdog
timeout was treated as a quality rejection that deleted an agency the Torneio had just
verified against up to 60 live pages.

Decision:

- **Optional (best-effort) fields are judged only where the field has Presença** —
  provable existence on the page via an Âncora de Evidência or two witnesses with
  distinct selectors agreeing. Gate: winner acertividade over present pages ≥ the pass
  threshold, with at least 5 present pages. This replaces ADR 0001's "best-effort
  fields ride on coverage alone". A field without independent evidence abstains, with
  the reason recorded in the attempt report (`gated_reason`).
- **The same selector re-proposed with a different pipeline is one witness**: page
  truth votes are deduplicated per selector.
- **The post-persist Scrapy run is a Validação de Fumaça**: it confirms `active` or
  downgrades to `saved_inactive`, never rejects or deletes. A timed-out run reads the
  partial feed output and is inconclusive, not a failure. `rejected` is reserved for
  Torneio-level evidence (unverifiable mandatory fields).

## Considered Options

- **Lower the optional-field threshold** — still conflates "field absent" with
  "extractor wrong"; rare-but-extractable fields keep dying, noisy ones start passing.
- **Let the smoke test keep veto power** — its 10-item `pass_rate` signal is far weaker
  than the Torneio's consensus over 20–60 pages; an infra hiccup discarded LLM rounds
  and verified extractors.
- **Replace the pipeline with an agentic orchestrator** — rejected: loses the
  measurability (acertividade, comparable attempt reports) that shows whether the
  system is improving.

## Consequences

- Optional fields with no anchor support and a single firing witness are never
  onboarded (honest abstention). Extending anchors to boolean amenities (piscina,
  mobiliado…) is the path to shrink that gap.
- Agencies whose validation is inconclusive land as `saved_inactive` and need manual
  activation or a revalidation run.
- Attempt reports include every judged field with `verified`/`gated_reason`, so a
  dropped field is always explainable from the report alone.
