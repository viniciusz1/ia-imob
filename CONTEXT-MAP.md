# Context Map

## Contexts

- [Crawler Machine](./crawler-machine/CONTEXT.md) — extracts real estate property listings from agency websites and persists them to Postgres.
- [White-Label Public Site](./docs/contexts/whitelabel/CONTEXT.md) — public, SEO-facing storefront where an Agency's published properties are shown to final clients.
- [Property Valuation](./docs/contexts/valuation/CONTEXT.md) — estimates a property's market value from its characteristics and comparable market properties.
- [AI Searcher](./docs/contexts/ai-searcher/CONTEXT.md) — lets Agency Users search the platform's market-wide property inventory through natural-language or conventional filters.
- [Platform Administration](./docs/contexts/platform-administration/CONTEXT.md) — internal system administration for managing Agencies and platform-level access.
- [Access Control](./docs/contexts/access-control/CONTEXT.md) — cross-cutting Agency data isolation and the Group/Permission model every other context is gated by.

## Relationships

- **White-Label Public Site**: reads only the Agency's own published `Property` inventory. It does **not** consume `MarketProperty` / Crawler Machine output — the scraped market data powers the internal AI Searcher, a separate surface.
- **Property Valuation -> Crawler Machine**: Property Valuation uses `MarketProperty` records from each Crawl Agency's current Published Snapshot as comparable evidence for estimating market value.
- **AI Searcher -> Crawler Machine**: AI Searcher reads `MarketProperty` records from each Crawl Agency's current Published Snapshot to answer market-wide property queries.
- **Platform Administration -> White-Label Public Site**: Platform Administration creates and manages Agencies; each Agency can own a White-Label Public Site.
- **Platform Administration -> Crawler Machine**: Platform Admins govern global Crawl Agencies and request crawler operations; Crawler Machine executes those operations asynchronously and reports their progress and outcome.
- **Access Control -> every context**: Access Control owns the two questions every other context defers to — which Agency's data a request may touch (Agency Scope) and which capabilities a user holds (Grupos and Permissões). Agency-scoped reads in White-Label Public Site, Property Valuation, and the CRM all resolve through its Current Agency; the Platform Permissions that gate Platform Administration and Crawler Operations are defined by it.
- **Access Control <-> Platform Administration**: Platform Administration defines who Platform Admins and Agency Admins are as product roles; Access Control defines how that distinction is enforced (no Agency membership plus a Platform Permission) and how Groups carry it.
