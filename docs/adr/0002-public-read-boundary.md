# Public site reads through a dedicated, whitelisting API — never the CRM endpoint

The white-label public site consumes a separate, unauthenticated, read-only API (`routes/api/public.php`, e.g. `GET /api/public/properties`) rather than the authenticated `PropertyController`. The tenant is resolved from the request host (subdomain → `tenant_id`); every query hard-filters `tenant_id = X AND is_published = true`.

Responses are serialized through a dedicated `PublicPropertyResource` that **whitelists** only safe fields. Internal fields must never cross this boundary: `internal_notes`, `owner_id`/`broker_id` internals, `keys_location`, and (conditionally) exact location and price.

Privacy gating happens at the API layer, not just in rendering, because an anonymous visitor can read the raw JSON in devtools:

- `show_exact_address = false` → the response **omits** `street`, `number`, `complement` entirely and **never sends the real `latitude`/`longitude`**. It returns only `neighborhood` + `city` and a **coarsened** coordinate (neighborhood-centroid or rounded/jittered) so the "approximate" map cannot be reverse-engineered to the exact point.
- `show_price = false` → the response omits the price; the UI shows "Sob consulta".

We chose this over reusing the authenticated property endpoint because the obvious shortcut — "just call the existing endpoint" — would leak internal CRM data and exact locations to anonymous visitors and bypass the published/tenant filters. Keeping a separate read model makes the safe path the only path.
