# Context Map

## Contexts

- [Imobscrapy](./imobscrapy/CONTEXT.md) — extracts real estate property listings from agency websites.
- [White-Label Public Site](./docs/contexts/whitelabel/CONTEXT.md) — public, SEO-facing storefront where an Agency's published properties are shown to final clients.
- [Property Valuation](./docs/contexts/valuation/CONTEXT.md) — estimates a property's market value from its characteristics and comparable market properties.
- [Platform Administration](./docs/contexts/platform-administration/CONTEXT.md) — internal system administration for managing Agencies and platform-level access.

## Relationships

- **White-Label Public Site**: reads only the Agency's own published `Property` inventory. It does **not** consume `ScrapyProperty` / Imobscrapy output — the scraped market data powers the internal AI Searcher, a separate surface.
- **Property Valuation -> Imobscrapy**: Property Valuation uses scraped market properties as comparable evidence for estimating market value.
- **Platform Administration -> White-Label Public Site**: Platform Administration creates and manages Agencies; each Agency can own a White-Label Public Site.
