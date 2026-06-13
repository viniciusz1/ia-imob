# Context Map

## Contexts

- [Imobscrapy](./imobscrapy/CONTEXT.md) — extracts real estate property listings from agency websites.
- [Cadastrador](./cadastrador/CONTEXT.md) — turns an agency URL and HTML evidence into database-backed extraction configuration.
- [White-Label Public Site](./docs/contexts/whitelabel/CONTEXT.md) — public, SEO-facing storefront where a Tenant's published properties are shown to final clients.
- [Property Valuation](./docs/contexts/valuation/CONTEXT.md) — estimates a property's market value from its characteristics and comparable market properties.

## Relationships

- **Cadastrador -> Imobscrapy**: Cadastrador produces **Extractors** consumed by Imobscrapy spiders.
- **White-Label Public Site**: reads only the Tenant's own published `Property` inventory. It does **not** consume `ScrapyProperty` / Imobscrapy output — the scraped market data powers the internal AI Searcher, a separate surface.
- **Property Valuation -> Imobscrapy**: Property Valuation uses scraped market properties as comparable evidence for estimating market value.
