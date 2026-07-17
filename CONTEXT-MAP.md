# Context Map

## Contexts

- [Crawler Machine](./crawler-machine/CONTEXT.md) — extracts real estate property listings from agency websites and persists them to Postgres.
- [White-Label Public Site](./docs/contexts/whitelabel/CONTEXT.md) — public, SEO-facing storefront where an Agency's published properties are shown to final clients.
- [Property Valuation](./docs/contexts/valuation/CONTEXT.md) — estimates a property's market value from its characteristics and comparable market properties.
- [Market Insights](./docs/contexts/market-insights/CONTEXT.md) — explains the current distribution and relative concentration of valid market listings by city and neighborhood.
- [Platform Administration](./docs/contexts/platform-administration/CONTEXT.md) — internal system administration for managing Agencies and platform-level access.

## Relationships

- **White-Label Public Site**: reads only the Agency's own published `Property` inventory. It does **not** consume `MarketProperty` / Crawler Machine output — the scraped market data powers the internal AI Searcher, a separate surface.
- **Property Valuation -> Crawler Machine**: Property Valuation uses `MarketProperty` records from the latest completed crawler run as comparable evidence for estimating market value.
- **Market Insights -> Crawler Machine**: Market Insights aggregates valid `MarketProperty` records from the latest completed run of every source and uses the crawler catalogs for canonical city, neighborhood, and property-type names.
- **Market Insights -> Versioned Boundaries**: the Offer Map joins canonical neighborhood names to licensed, versioned GeoJSON files. Listings without a matching boundary remain in totals, coverage, and the unmapped list.
- **AI Searcher -> Crawler Machine**: AI Searcher reads `MarketProperty` records from the latest completed crawler run to answer market-wide property queries.
- **Platform Administration -> White-Label Public Site**: Platform Administration creates and manages Agencies; each Agency can own a White-Label Public Site.
