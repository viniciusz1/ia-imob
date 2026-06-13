# Full logical multi-agency platform with Agency as the customer

To support white-label public sites, the platform becomes a logical multi-agency SaaS rather than a single-agency CRM. We introduce a first-class `Agency` entity that represents a real estate agency; every agency-owned `User` (a broker/property-seller), `Property`, lead, and configuration belongs to exactly one Agency via `agency_id`, enforced by a global Eloquent scope. Media storage is isolated per agency (e.g. `agencies/{id}/...`).

We chose full multi-agency isolation now over the cheaper "seam now, isolation later" option because the white-label product requires real data isolation from day one and retrofitting `agency_id` across a populated multi-table schema later is far more painful than building it in while tables are small.

## Consequences

- Billing moves from the individual user to the agency: `AgencySubscription` is keyed by `agency_id`. `Agency` keeps an `owner_user_id` for the primary contact / signup user.
- Agency users belong to exactly one Agency; Platform Admin users may be agency-less. `email` and `username` remain **globally unique** (one human = one login), keeping the CRM login flow simple. Revisit only if a single person must operate across multiple agencies.
- `group_id` / `team_id` on `users` remain intra-agency org units (teams inside one agency), a separate axis from `agency_id`.
- Agency-level brand/site settings live on the `Agency`; per-broker public profile fields stay on the `User` and render on that agency's site.
