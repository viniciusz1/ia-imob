# Access Control — Enforcement Gaps

Points where the code does not enforce the model documented in [CONTEXT.md](./CONTEXT.md). Each entry is verifiable in the referenced file, not a hypothesis. Recorded so that work touching access control does not mistake current behavior for intended behavior.

Verified against `main` at commit `690aa92` (2026-08-10). Gaps 1, 2 and 5 were closed after that; their entries record what was done and what is left.

## 1. `User` is not an Agency-Owned Record — *narrowed*

`app/Models/User.php` still does not apply `BelongsToAgency`, so **Agency Scope never runs on users**. The boundary is instead applied explicitly by `UserRepository::constrainToCurrentAgency()`, which every read in that repository passes through: an Agency user sees their own Agency's users, an agency-less actor sees the agency-less ones, and a query with no actor (CLI, seeders) is unconstrained — the same rule `AgencyScope` uses.

The global scope was deliberately not applied to `User`. `BelongsToAgency::currentAgencyId()` calls `auth()->user()`, and the session guard resolves the authenticated user *by querying the User model*; a global scope on `User` would re-enter the guard mid-resolution and recurse. Closing this properly means either a recursion-safe override on `User` or keeping the boundary explicit as it is now.

What remains: any future code path that queries `User` outside `UserRepository` is unscoped, and single-record access relies on `UserPolicy` (gap 2) rather than the query layer. `AgencySiteSettings`, `SavedFilter`, and `AgencySubscription` still carry `agency_id` without a scope and rely on their controllers to filter. Only `Property`, `PropertyValuation` and `Lead` are Agency-Owned by scope.

## 2. `UserPolicy` authorizes everything — *closed*

Every method used to return `true`, so the seeded `users.*` Permissions were enforced nowhere and any authenticated user could read, create, edit and delete any user of any Agency.

`app/Policies/UserPolicy.php` now requires the matching Permission *and* a shared Agency for every single-user decision, distinguishes `users.edit.self` from `users.edit.all`, and refuses self-deletion (which could otherwise lock an Agency out of its own workspace). A Platform Admin shares an Agency with nobody and therefore administers no Agency's users, matching the split documented in [CONTEXT.md](./CONTEXT.md).

`tests/Feature/UserAgencyIsolationTest.php` locks the boundary.

## 3. The Group Catalog is shared but not treated as shared

`config/permission.php:134` sets `'teams' => false`, and the `roles` table takes `unique(['name', 'guard_name'])` (`database/migrations/2026_03_01_221733_create_permission_tables.php:50`) with no `agency_id`. The Group Catalog is platform-wide by construction, yet the endpoints present it as if it were the Agency's own:

- `RoleController::index` (:19) lists every Group of the guard with no Agency filter — Agency A sees Agency B's Groups.
- `update` and `destroy` require only `roles.manage`, so Agency A can rename, re-permission, or delete a Group that Agency B's users hold.
- Editing the seeded **Grupo Administrador** changes what every Agency's admins can do.
- The platform-wide name uniqueness means two Agencies cannot both have a Group named e.g. "Gerente"; the second gets a validation error with no explanation available to them.

## 4. Platform Permissions are offered to Agency Admins

`PermissionController::index` (:13) returns every Permission of the guard, including `platform.*` and `crawler.*`. `RoleFormModal` does not filter them, so they are selectable in the CRM's Grupos UI, and `StoreRoleRequest`/`UpdateRoleRequest` accept any existing permission id.

Escalation to the Admin Area is still blocked: the **Admin Area Gate** (`EnsurePlatformAdmin`) rejects any user with a non-null `agency_id` before the `can:` check runs, so an Agency User holding `crawler.view` still gets 403. The practical damage is therefore confined to (a) a confusing UI that advertises capabilities the Agency cannot use, and (b) a Group that silently becomes privileged if a Platform Admin is ever assigned it.

## 5. `EnsureAgencyIsActive` is dead code — *closed*

The middleware existed but was registered nowhere, so deactivating an Agency blocked only the **White-Label Public Site**; its users kept working in the CRM normally.

It now runs on the authenticated API group in `routes/api.php`, after `auth:sanctum` so the user is resolved before the check. Platform Admins belong to no Agency and pass through.

The regression test for this was passing for the wrong reason: it asserted 403 for a user of a deactivated Agency who had no permission for the endpoint either, so it would have passed with the middleware absent — as it in fact did. It now grants the permission first, and a companion test covers the Platform Admin exemption.

## 6. Agency registration rewrites a shared Group

`AdminAgencyController::store` calls `syncPermissions` on the shared **Grupo Administrador** on every Agency registration (`app/Http/Controllers/Api/AdminAgencyController.php:107`). It is idempotent as written — it re-syncs the same "all non-`platform.*`/non-`crawler.*`" set — but it means a per-Agency workflow mutates platform-wide state. Any manual customization of that Group is silently reverted the next time an Agency is registered.

## 7. `Grupo Corretor` is seeded empty

`RoleSeeder` creates `Corretor` (:21) but syncs Permissions only for `Administrador` and `Platform Admin`. A user placed in the Corretor Group receives zero Permissions and sees an empty CRM until someone edits the Group.

## 8. Groups and Teams as entities do not exist

`users.group_id` and `users.team_id` are described by ADR-0001 as intra-Agency org units, but the `Group` and `Team` models are commented out in `app/Models/User.php` and `group_id` is `prohibited` in both `StoreUserRequest` and `UpdateUserRequest`. "Grupos" in the product means Permission Groups (Spatie roles), not `users.group_id`. `team_id` is accepted and filterable but references nothing.

## Direction, not yet decided

Closing gap 3 is a fork in the road, and the rest of the gaps read differently depending on which branch is taken:

- **Per-Agency Group Catalog** — enable the Spatie teams feature with `agency_id` as the team key, or add an explicit `agency_id` to `roles` plus scoping in `RoleController`. Groups become Agency-scoped; name uniqueness becomes per-Agency; gaps 3, 4 and 6 dissolve.
- **Keep one platform-wide catalog** — then `roles.manage` is a platform-level capability, must be removed from **Grupo Administrador**, and the CRM's Grupos screen becomes read-only for Agency Admins.

Gaps 1, 2 and 5 were independent of that choice and have been addressed; gap 1 is narrowed rather than closed.

Per `AGENTS.md`, any change here must move together: the permission seeders/migrations, the backend authorization, the **Serialized Permission Contract**, and the frontend checks that consume it.
