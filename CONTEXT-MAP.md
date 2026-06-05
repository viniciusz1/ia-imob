# Context Map

## Contexts

- [Imobscrapy](./imobscrapy/CONTEXT.md) — extracts real estate property listings from agency websites.
- [Cadastrador](./cadastrador/CONTEXT.md) — turns an agency URL and HTML evidence into database-backed extraction configuration.
- [White-Label Public Site](./docs/contexts/whitelabel/CONTEXT.md) — public, SEO-facing storefront where a Tenant's published properties are shown to final clients.

## Relationships

- **Cadastrador -> Imobscrapy**: Cadastrador produces **Extractors** consumed by Imobscrapy spiders.
- **White-Label Public Site**: reads only the Tenant's own published `Property` inventory. It does **not** consume `ScrapyProperty` / Imobscrapy output — the scraped market data powers the internal AI Searcher, a separate surface.
