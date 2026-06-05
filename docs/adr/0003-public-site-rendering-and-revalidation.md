# Public site uses ISR with backend-triggered on-demand revalidation

Public property detail pages and category/landing pages are rendered with Next.js ISR (statically generated, then revalidated) for SEO and speed. Cache freshness is driven by **on-demand revalidation**: when Laravel observes a `Property` change (publish, unpublish, update) or a Tenant's branding change, it fires a **signed webhook** to a Next route (`POST /api/revalidate`) that calls `revalidateTag` on tags such as `tenant:{id}` and `property:{id}`. Search/filter result pages are rendered SSR (dynamic), since filter combinations are unbounded and are not the indexable SEO surface.

We chose backend-triggered tag revalidation over purely time-based ISR because the failure mode of stale caching here is serving a **sold or unpublished property** to the public — unacceptable for a real estate storefront. On-demand purges make an unpublish take effect in seconds.

## Consequences

- Laravel needs a `Property` observer (and a branding observer) that POSTs to the Next revalidation endpoint; the endpoint must verify a shared signature/secret.
- Cache tagging convention (`tenant:{id}`, `property:{id}`) must be applied consistently in the public fetch layer.
- The indexable SEO surface is detail pages + neighborhood/type landing pages, not arbitrary filtered search URLs.
