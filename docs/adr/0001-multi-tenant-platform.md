# Full logical multi-tenancy with Tenant as the agency

To support white-label public sites, the platform becomes a logical multi-tenant SaaS rather than a single-agency CRM. We introduce a first-class `Tenant` entity that represents a real estate agency; every `User` (a broker/property-seller), `Property`, lead, and configuration belongs to exactly one Tenant via `tenant_id`, enforced by a global Eloquent scope. Media storage is isolated per tenant (e.g. `tenants/{id}/...`).

We chose full multi-tenancy now over the cheaper "seam now, isolation later" option because the white-label product requires real data isolation from day one and retrofitting `tenant_id` across a populated multi-table schema later is far more painful than building it in while tables are small.

## Consequences

- Billing moves from the individual user to the agency: `TenantSubscription` is re-keyed from `user_id` to `tenant_id`. `Tenant` keeps an `owner_user_id` for the primary contact / signup user.
- A `User` belongs to exactly one Tenant; `email` and `username` remain **globally unique** (one human = one login), keeping the CRM login flow simple. Revisit only if a single person must operate across multiple agencies.
- `group_id` / `team_id` on `users` remain intra-tenant org units (teams inside one agency), a separate axis from `tenant_id`.
- Agency-level brand/site settings live on the `Tenant`; per-broker public profile fields stay on the `User` and render on that tenant's site.
