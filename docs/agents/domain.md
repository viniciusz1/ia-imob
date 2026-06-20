# Domain Docs

Engineering skills should consume this repo's domain documentation before changing or evaluating code.

## Layout

This repo uses a multi-context layout.

Read `CONTEXT-MAP.md` at the repo root when it exists. It points to the relevant context docs for each area, including:

- `ai-backendd-imobiliaria/CONTEXT.md`
- `ai-front-end-imobiliaria/CONTEXT.md`
- `imobscrapy/CONTEXT.md`

Read `docs/adr/` for system-wide decisions when it exists.

For context-specific decisions, also check each context's `docs/adr/` directory when present, for example:

- `ai-backendd-imobiliaria/docs/adr/`
- `ai-front-end-imobiliaria/docs/adr/`
- `imobscrapy/docs/adr/`

If any of these files do not exist, proceed silently. Do not require creating them before work starts; producer skills can create them lazily when terms or decisions are resolved.

## Vocabulary

When output names a domain concept, use the term defined in the relevant `CONTEXT.md`.

If the concept is missing from the glossary, either reconsider whether the term belongs in the project language or note the gap for `/grill-with-docs`.

## ADR Conflicts

If output contradicts an existing ADR, surface the conflict explicitly instead of silently overriding it.
