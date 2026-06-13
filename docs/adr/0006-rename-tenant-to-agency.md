# Rename Tenant to Agency across code and database

We will use `Agency` as the canonical name for the platform customer that owns users, properties, leads, branding, subscriptions, and public sites, and we will rename the former Tenant vocabulary completely across code and database (`tenants`/`tenant_id` become `agencies`/`agency_id`). We chose a full rename instead of a compatibility alias because the product language is real-estate specific and the code already uses Agency for scraping concepts, so leaving both Tenant and Agency in the customer domain would keep ambiguity alive.

## Consequences

- Scraping-oriented agencies must remain explicitly named **Source Agencies** to avoid collision with customer Agencies.
- Platform Admin users may be agency-less; Agency users remain scoped by `agency_id`.
- The migration touches model names, relationship names, table names, foreign keys, API payloads, frontend permission checks, docs, and tests in one coordinated change.
