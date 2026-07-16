# Context Map

## Contexts

- [Crawler Machine](./crawler-machine/CONTEXT.md) — extracts real estate property listings from agency websites and persists them to Postgres.
- [White-Label Public Site](./docs/contexts/whitelabel/CONTEXT.md) — public, SEO-facing storefront where an Agency's published properties are shown to final clients.
- [Property Valuation](./docs/contexts/valuation/CONTEXT.md) — estimates a property's market value from its characteristics and comparable market properties.
- [Platform Administration](./docs/contexts/platform-administration/CONTEXT.md) — internal system administration for managing Agencies and platform-level access.

## Relationships

- **White-Label Public Site**: reads only the Agency's own published `Property` inventory. It does **not** consume `MarketProperty` / Crawler Machine output — the scraped market data powers the internal AI Searcher, a separate surface.
- **Property Valuation -> Crawler Machine**: Property Valuation uses `MarketProperty` records from each Crawl Agency's current Published Snapshot as comparable evidence for estimating market value.
- **AI Searcher -> Crawler Machine**: AI Searcher reads `MarketProperty` records from each Crawl Agency's current Published Snapshot to answer market-wide property queries.
- **Platform Administration -> White-Label Public Site**: Platform Administration creates and manages Agencies; each Agency can own a White-Label Public Site.
- **Platform Administration -> Crawler Machine**: Platform Admins govern global Crawl Agencies and request crawler operations; Crawler Machine executes those operations asynchronously and reports their progress and outcome.
