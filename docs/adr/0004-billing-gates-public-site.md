# Subscription status gates the public site; lapsed serves 503, cancelled serves 404

A Tenant's white-label site is served only when its `TenantSubscription` is `Active`. Tenant resolution (host → `tenant_id`) also loads subscription status and short-circuits before rendering:

- `Active` → site live.
- `Inactive` / `Expired` (lapsed, recoverable) → **HTTP 503** "temporarily unavailable".
- `Cancelled` → **HTTP 404/410** (gone, let it deindex).
- `Pending` → subdomain preview only, not served on a custom domain.

We return **503 for lapsed** rather than a hard 404 because a brief non-payment lapse must not deindex an agency's organic rankings — 503 signals "retry later" to crawlers and the site recovers instantly on payment. A 404 is reserved for genuine cancellation, where deindexing is correct.

## Consequences

- The freshness webhook (ADR-0003) must also re-evaluate the site when subscription status changes (e.g. Asaas webhook flips a Tenant to Inactive → purge/transition the public cache).
- "Site live" depends on billing, so a billing bug can take a paying site offline — the Active check must be conservative and well-tested.
