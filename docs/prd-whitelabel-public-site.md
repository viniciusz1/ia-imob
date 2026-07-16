## Problem Statement

A real estate agency that uses our CRM has its inventory locked inside an internal, authenticated tool. It has no public, branded place to send buyers — so it pays for third-party portals or a separate web agency, loses the lead data to those platforms, and gets no organic Google traffic of its own. The agency wants its *own* website, under its *own* brand and domain, where the public can find and inquire about the properties it actually controls.

From the agency's perspective: "I have my properties in the system already. I want them to show up on a good-looking site that looks like *mine*, ranks on Google, and sends the leads to *me* — without hiring anyone to build it."

From a buyer's perspective: "I want to search a specific agency's properties for sale or rent and quickly reach a broker about the one I like."

## Solution

A **White-Label Public Site**: a public, SEO-optimized storefront, generated from a shared **Template** and re-skinned per agency via that agency's **Branding**. Each agency is a **Agency**; its site shows only its own **Published Properties** (`Property` records with `is_published = true` — never scraped `ScrapyProperty` data). A **Final Client** (anonymous visitor) browses and searches the inventory and converts by submitting the contact form (creating a **Lead**) or tapping a WhatsApp deep-link.

To make this real, the platform becomes a logical multi-agency SaaS (see ADR-0001): a first-class `Agency` owns its Brokers, Properties, Leads, Branding, and billing. The public site is served per Agency, resolved from the request host (subdomain for v1, custom domains later), and is gated by the Agency's subscription status (ADR-0004). The agency configures its Branding through a basic site-settings page in the CRM.

This PRD covers the **v1** slice: the multi-tenancy foundation, the public read API, one Template with the core public pages (Home, Search, Property detail, Contact), Lead capture, the CRM site-settings page, and the SEO + freshness machinery.

## User Stories

### Final Client (anonymous buyer/renter)

1. As a Final Client, I want to open an agency's site at its own address (subdomain in v1), so that I land on a storefront that looks like the agency's brand.
2. As a Final Client, I want to see highlighted properties on the home page, so that I immediately see the agency's best inventory.
3. As a Final Client, I want to search properties by purpose (Comprar / Alugar), so that I only see properties relevant to my intent.
4. As a Final Client, I want to filter by property type, city, neighborhood, price range, bedrooms, bathrooms, suites, garage spaces, minimum area, and headline amenities, so that I can narrow to properties that fit my needs.
5. As a Final Client, I want to search by a property's reference code, so that I can jump straight to a property a broker mentioned to me.
6. As a Final Client, I want search results paginated and sortable, so that I can browse a large inventory without being overwhelmed.
7. As a Final Client, I want to open a property detail page with a photo gallery, so that I can evaluate the property visually.
8. As a Final Client, I want to see the property's characteristics (bedrooms, suites, bathrooms, area, garage, floor, year) and amenities, so that I can assess fit.
9. As a Final Client, I want to see the price, or "Sob consulta" when the agency chose not to publish it, so that I know the cost or that I must ask.
10. As a Final Client, I want to see the location on a map, so that I understand where the property is.
11. As a Final Client, I want the map to show only an approximate area when the agency has chosen to hide the exact address, so that my expectations match what the agency is willing to share.
12. As a Final Client, I want to see the listing broker's public profile, so that I know who to talk to.
13. As a Final Client, I want to submit a contact form about a specific property, so that the agency knows I'm interested and contacts me.
14. As a Final Client, I want a WhatsApp button that opens a chat with a prefilled message referencing the property, so that I can reach the agency instantly.
15. As a Final Client, I want to watch a property video or virtual tour when available, so that I can explore remotely.
16. As a Final Client, I want to see similar properties on a detail page, so that I can keep browsing relevant options.
17. As a Final Client, I want shared property links to render with the cover photo, title, and price on WhatsApp and social media, so that shared listings look credible.
18. As a Final Client, I want the site to load fast on mobile, so that I don't abandon it.
19. As a Final Client searching on Google, I want to find an agency's specific properties in organic results with price and photo, so that I can discover listings without knowing the agency first.
20. As a Final Client, I want a recently sold or unpublished property to disappear from the public site promptly, so that I don't waste time inquiring about unavailable properties.
21. As a Final Client, I want the site to be in Brazilian Portuguese, so that it reads naturally.

### Agency / Broker (agency user in the CRM)

22. As a Broker, I want a property I publish (`is_published = true`) to appear on my agency's public site, so that buyers can find it.
23. As a Broker, I want an unpublished property to never appear publicly, so that drafts and internal listings stay private.
24. As a Broker, I want my internal data (internal notes, owner/broker internals, keys location) to never be exposed publicly, so that confidential information is protected.
25. As a Broker, I want to hide a property's exact address, so that the precise location is not exposed to the public (and is not even sent to the browser).
26. As a Broker, I want to hide a property's price, so that buyers must contact me to learn it.
27. As a Broker, I want leads submitted on my agency's site to be captured and to reach the listing broker, so that no inquiry is lost.
28. As an agency admin, I want to configure my agency's Branding (logo, favicon, color palette, default WhatsApp number, social links, analytics IDs), so that the public site reflects my brand.
29. As an agency admin, I want to see my agency's public site address (subdomain) in the CRM, so that I know where my site lives.
30. As an agency admin, I want my published properties' pages to be indexable by Google with proper titles, descriptions, and structured data, so that I get organic traffic.
31. As an agency admin, I want my brand and inventory isolated from other agencies, so that I never see or expose another agency's data.
32. As an agency admin, I want my public site to stay live only while my subscription is active, and I understand it goes offline if I stop paying.

### Platform

33. As the platform, I want every Property, Broker, Lead, and configuration scoped to a Agency via `agency_id`, so that data is isolated per agency.
34. As the platform, I want to resolve the correct Agency from the request host, so that each public request serves the right agency.
35. As the platform, I want a lapsed subscription's site to return 503 (recoverable) and a cancelled subscription's site to return 404 (gone), so that brief non-payment does not destroy an agency's SEO but genuine cancellation deindexes.
36. As the platform, I want public property/landing pages cached and revalidated on change, so that the site is fast yet never serves a stale sold property.
37. As the platform, I want public lead submissions rate-limited and spam-resistant, so that the Lead inbox is not flooded.
38. As the platform, I want each property to have a stable, SEO-friendly slug, so that indexed and shared links don't break.

## Implementation Decisions

### Multi-tenancy foundation (ADR-0001)
- Introduce a first-class `Agency` model (the agency), with an `owner_user_id` (primary contact / signup user).
- Add `agency_id` to `users`, `properties`, and the new `leads` table, plus other agency-owned tables, enforced by a global Eloquent scope so queries return only the current Agency's rows.
- A `User` (a **Broker**) belongs to exactly one Agency. `email` / `username` remain globally unique. `group_id` / `team_id` remain intra-agency org units.
- Re-key `AgencySubscription` from `user_id` to `agency_id`; the agency is the billing entity.
- Media is isolated per Agency by storage path prefix (`agencies/{id}/...`). v1 keeps the existing `local` disk (no object storage / CDN yet) with per-agency folders — an explicit, documented deferral.

### Agency resolution
- A `agency_domains` table (`agency_id`, `hostname`, `is_primary`, `verified_at`) maps hostnames to Agencies. v1 ships subdomain resolution (`{slug}.{platform-domain}`); the table is built to support custom domains later without schema change.
- The public Next.js app resolves the Agency from the `Host` header in `middleware.ts` and injects the resolved agency context into the `(public)` routes. The CRM's own host falls through to the dashboard. (Single shared middleware — the accepted coupling cost of keeping the public site in the existing app.)

### Public read API (ADR-0002)
- A new unauthenticated, read-only route group (`routes/api/public.php`): `GET /api/public/properties`, `GET /api/public/properties/{slug}`, `POST /api/public/leads`.
- Every read hard-filters `agency_id = <resolved> AND is_published = true`. The endpoint is distinct from the authenticated `PropertyController`.
- A dedicated `PublicPropertyResource` **whitelists** safe fields only. It never emits `internal_notes`, owner/broker internals, or `keys_location`. Privacy is enforced at the API layer, not just in rendering:
  - `show_exact_address = false` → omit `street`, `number`, `complement`; do not send real `latitude`/`longitude`; send only `neighborhood` + `city` and a coarsened coordinate (neighborhood-centroid or rounded/jittered).
  - `show_price = false` → omit price; UI renders "Sob consulta".
- Search supports purpose, property_type, city, neighborhood, price range (by purpose), bedrooms, bathrooms, suites, garage_spaces, min area, headline amenities (features pivot), free text, and direct `reference_code` lookup, with pagination and sort. `Property` gains the public filtering query logic it currently lacks (only `ScrapyProperty` has it today).

### Properties shown
- The public site reads only `Property` where `is_published = true`. `ScrapyProperty` / the AI Searcher is a separate surface and is never shown on a White-Label Site.
- Both `sale` (Comprar) and `rent` (Alugar) purposes are supported; the Template's hero CTA defaults to Comprar.

### Lead capture
- A new `leads` table/model: `agency_id`, nullable `property_id`, `name`, `phone`, `email`, `message`, `source`, `status`.
- `POST /api/public/leads` creates a agency-scoped Lead and notifies the listing broker (or an agency default contact). v1 = persist + notify; no CRM inbox UI (the table is shaped so an inbox is a trivial follow-up). The contact form coexists with a WhatsApp deep-link, which produces no Lead.

### Branding & Template
- A `agency_site_settings` table (1:1 with Agency): `logo_path`, `favicon_path`, color palette (`primary`, `secondary`, `accent`, `bg`, `surface`, `text`, `muted`), `theme_slug`, `default_whatsapp`, social links, `google_analytics_id` / `meta_pixel_id`, hero text, about/contact blurb.
- One Template for v1, selected by `theme_slug` (so multiple Templates are a later switch, not a refactor). Branding is injected as CSS custom properties at the `(public)` root layout; the Template references only those tokens.
- A basic CRM site-settings page lets an agency admin set its Branding and view its subdomain. No page builder.

### Public site placement & rendering (ADR-0003)
- The public site is a `(public)` route group inside the existing Next.js app, strictly folder-separated: its own root layout (no auth shell, public theme provider), its own `services/public/` (token-less API clients), its own `components/themes/` tree.
- Property detail pages and category/landing pages use ISR. Laravel fires a signed webhook to a Next route (`POST /api/revalidate`) on Property publish/unpublish/update and on Branding change, calling `revalidateTag` on tags such as `agency:{id}` and `property:{id}`. Search/filter pages are SSR.

### SEO
- `Property` gains a stored, backend-generated `slug` (format `{purpose}-{type}-{bedrooms}-quartos-{neighborhood}-{city}-ref{reference_code}`), unique per Agency, generated once and stable after first publish; a changed slug issues a 301.
- Per-property `generateMetadata` (title/description), Open Graph + Twitter cards using the cover photo, `RealEstateListing` JSON-LD (price, geo, area, photos), canonical URLs, a per-agency dynamic `sitemap.ts`, and `robots.txt`.

### Subscription gating (ADR-0004)
- Agency resolution loads subscription status and short-circuits: `Active` → live; `Inactive`/`Expired` → 503; `Cancelled` → 404/410; `Pending` → subdomain preview only.
- The Asaas webhook flipping a Agency's subscription status must also trigger public-cache re-evaluation/purge (ties into the ADR-0003 revalidation path).

### Locale
- pt-BR only for v1.

## Testing Decisions

Good tests here assert **external behavior at the highest seam** — the HTTP boundary and rendered component output — not implementation internals (not the global-scope class, not the slug generator's private methods, not middleware plumbing). Prior art to mirror: `tests/Feature/PropertyTest.php`, `tests/Feature/RoleApiTest.php`, `tests/Feature/SubscriptionTest.php` (Laravel Feature tests using `RefreshDatabase`, factories, seeders, and Sanctum), and the existing Vitest + Testing Library setup on the frontend.

1. **Public API (primary seam, Laravel Feature tests, same shape as `PropertyTest`).**
   - `GET /api/public/properties` returns only the resolved Agency's published properties; never another Agency's, never unpublished.
   - Filters (purpose, type, city, neighborhood, price, bedrooms, etc.) and `reference_code` lookup return the expected subset; pagination/sort behave.
   - The whitelisting resource never includes internal fields; with `show_price = false` the price is absent and the contract signals "on request"; with `show_exact_address = false` the response has no `street`/`number`/`complement` and no real `latitude`/`longitude` (asserted explicitly — this is a privacy guarantee, not cosmetics).
   - `GET /api/public/properties/{slug}` resolves a published property and returns 404 for an unpublished one or one belonging to another Agency.
   - `POST /api/public/leads` creates a agency-scoped Lead, validates input, and is rate-limited (excess submissions rejected).

2. **Multi-tenancy isolation (extend the existing CRM HTTP seam).** Acting (Sanctum) as a user of Agency A, the existing authenticated endpoints (`/api/properties`, etc.) never return Agency B's rows. Tested through the HTTP boundary, not by inspecting the scope class.

3. **Slug (through the create/update HTTP flow).** Creating a `Property` yields a `slug`; updating editable fields does not change an already-published property's slug.

4. **Revalidation webhook (`Http::fake()` on the backend; Vitest on the Next handler).** Publishing/unpublishing/updating a `Property` causes Laravel to POST the signed revalidate request with the correct tags. The Next `/api/revalidate` route accepts a valid signature and rejects an invalid one.

5. **Frontend public components (Vitest + Testing Library).** Search filters produce the correct query; a price-hidden property renders "Sob consulta"; an address-hidden property renders the approximate map and no street/number; the contact form submits to the public leads endpoint.

Subscription gating (503/404/preview) is asserted through seam 1 — the public endpoints return the correct status for each subscription state — rather than as separate middleware-internals tests.

## Out of Scope

- `ScrapyProperty` / AI Searcher content on the public site (separate surface, never shown).
- Custom customer domains and per-domain TLS/DNS verification UI (v1 is subdomain-only; `agency_domains` table is built to support it later).
- Object storage / CDN for media (v1 stays on `local` disk with per-agency folders; migration deferred).
- A CRM Leads inbox / pipeline / assignment / statuses (the old `gestao-leads` vision); v1 only persists + notifies.
- A page builder, custom fonts, section reordering, or multiple Templates (one Template, fixed layout, branded via palette/logo).
- A brokers directory and "Sobre"/About pages (deferred to v2).
- Buyer accounts, public favorites, or saved searches for Final Clients.
- Internationalization beyond pt-BR.
- Online transactions / payments by Final Clients (buying real estate is lead-gen, not checkout).

## Further Notes

- Domain glossary lives in `docs/contexts/whitelabel/CONTEXT.md` (registered in `CONTEXT-MAP.md`). Note the deliberate disambiguation: **"Imobiliária" is a Crawl Agency in the crawler context (a scrape target) but an Agency here (a paying customer who publishes)** — these never overlap. Use **Broker** for a CRM `User` on the public side, **Final Client** for an anonymous visitor, and **Lead** only after a form submission.
- Decisions are recorded in ADRs: `0001` (multi-tenancy), `0002` (public read boundary + privacy at the API layer), `0003` (ISR + on-demand revalidation), `0004` (billing gates the site).
- Critical path: the multi-tenancy refactor (ADR-0001) underpins everything and should be the first implementation slice, landed and green before any public-site work begins.
- Open items intentionally left to implementation (not design decisions): map provider (Leaflet/OSM vs Google — note the system already imports OSM POIs via `PointOfInterest` / `NeighborhoodReferencePoint`), default search sort and page size, the exact lead anti-spam mechanism (rate-limit + honeypot/captcha), and the trigger point for migrating media to object storage.
- `property_type` / `purpose` / `status` are DB-driven `SystemEnum` values, not PHP enums — the public filter UI should source allowed values from there.
