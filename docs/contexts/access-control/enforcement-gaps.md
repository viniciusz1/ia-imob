# Access Control — Enforcement Gaps

Points where the code does not enforce the model documented in [CONTEXT.md](./CONTEXT.md). Each entry is verifiable in the referenced file, not a hypothesis. Recorded so that work touching access control does not mistake current behavior for intended behavior.

Verified against `main` at commit `690aa92` (2026-08-10).

## 1. `User` is not an Agency-Owned Record

`app/Models/User.php:16` does not apply `BelongsToAgency`, so **Agency Scope never runs on users**. `UserRepository::list()` (`app/Repositories/UserRepository.php:15`) filters by id, name, username, team, active and online — never by `agency_id`. `GET /users` therefore returns users of every Agency, and `findById()` resolves any user by id across Agencies.

Only three models are Agency-Owned today: `Property`, `PropertyValuation`, `Lead`. `AgencySiteSettings`, `SavedFilter`, and `AgencySubscription` carry `agency_id` without the scope, and rely on their controllers to filter.

## 2. `UserPolicy` authorizes everything

Every method in `app/Policies/UserPolicy.php` returns `true` — `viewAny` (:9), `view` (:14), `create` (:19), `update` (:24), `delete` (:29). The user Form Requests do delegate to the policy correctly (`StoreUserRequest`, `UpdateUserRequest`, `IndexUserRequest`, `ShowUserRequest`, `DestroyUserRequest`), so the wiring is right and the decision is the hole.

Consequence: the seeded `users.view`, `users.create`, `users.edit.self`, `users.edit.all`, `users.delete` Permissions are **not enforced anywhere**. Combined with gap 1, any authenticated user can read, create, edit and delete any user of any Agency, including Platform Admins. `users.edit.self` in particular has no code path distinguishing it from `users.edit.all`.

## 3. The Group Catalog is shared but not treated as shared

`config/permission.php:134` sets `'teams' => false`, and the `roles` table takes `unique(['name', 'guard_name'])` (`database/migrations/2026_03_01_221733_create_permission_tables.php:50`) with no `agency_id`. The Group Catalog is platform-wide by construction, yet the endpoints present it as if it were the Agency's own:

- `RoleController::index` (:19) lists every Group of the guard with no Agency filter — Agency A sees Agency B's Groups.
- `update` and `destroy` require only `roles.manage`, so Agency A can rename, re-permission, or delete a Group that Agency B's users hold.
- Editing the seeded **Grupo Administrador** changes what every Agency's admins can do.
- The platform-wide name uniqueness means two Agencies cannot both have a Group named e.g. "Gerente"; the second gets a validation error with no explanation available to them.

## 4. Platform Permissions are offered to Agency Admins

`PermissionController::index` (:13) returns every Permission of the guard, including `platform.*` and `crawler.*`. `RoleFormModal` does not filter them, so they are selectable in the CRM's Grupos UI, and `StoreRoleRequest`/`UpdateRoleRequest` accept any existing permission id.

Escalation to the Admin Area is still blocked: the **Admin Area Gate** (`EnsurePlatformAdmin`) rejects any user with a non-null `agency_id` before the `can:` check runs, so an Agency User holding `crawler.view` still gets 403. The practical damage is therefore confined to (a) a confusing UI that advertises capabilities the Agency cannot use, and (b) a Group that silently becomes privileged if a Platform Admin is ever assigned it.

## 5. `EnsureAgencyIsActive` is dead code

`app/Http/Middleware/EnsureAgencyIsActive.php` is not registered in `bootstrap/app.php` and is not attached to any route — it is referenced nowhere but its own definition. `AuthService::attemptLogin` checks only `user.is_active`, never the Agency's.

Consequence: deactivating an Agency currently blocks only the **White-Label Public Site** (via `ResolvePublicAgency`, which does check `is_active`). The Agency's users keep logging into the CRM and keep working normally, which contradicts **Deactivated Agency** as a state that "blocks use while preserving data".

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

Gaps 1, 2 and 5 are independent of that choice and are enforcement bugs under either branch.

Per `AGENTS.md`, any change here must move together: the permission seeders/migrations, the backend authorization, the **Serialized Permission Contract**, and the frontend checks that consume it.
