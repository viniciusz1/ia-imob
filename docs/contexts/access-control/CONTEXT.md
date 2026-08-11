# Access Control

The cross-cutting rules that decide **which Agency's data a request may touch** and **which capabilities a user may exercise**. Every other context inherits this vocabulary: data isolation is expressed as Agency Scope, and capability checks are expressed as Permissions granted through Groups.

## Language

**Agency**:
The platform's customer and the unit of data isolation. Every Agency-Owned Record belongs to exactly one Agency via `agency_id`. Agency is the canonical name for this concept (ADR-0006); the codebase no longer uses Tenant anywhere.
_Avoid_: Tenant, Crawl Agency, account, customer, workspace

**Agency-Owned Record**:
A record that belongs to exactly one Agency and is only ever readable and writable within that Agency. Its model declares ownership by applying Agency Scope.
_Avoid_: Scoped model, private record, tenant row

**Agency Scope**:
The global query constraint that restricts an Agency-Owned Record to the Current Agency, plus the write-side stamping of `agency_id` on creation. It is the single enforcement point for data isolation — a model without Agency Scope is not isolated, regardless of whether its table has an `agency_id` column.
_Avoid_: Tenant scope, filter, agency middleware, `where agency_id`

**Current Agency**:
The one Agency a request is allowed to act within, resolved per request. An Agency Host Override wins when present; otherwise it is the authenticated user's own Agency. When neither resolves, there is **no** Current Agency and Agency Scope applies no constraint — the deliberate escape hatch for CLI commands, seeders, and Platform Admin work.
_Avoid_: Active tenant, selected agency, logged-in agency

**Agency Host Override**:
The Current Agency established from the request's host rather than from a logged-in user, used by the White-Label Public Site so unauthenticated visitors still read exactly one Agency's data. Resolved from a custom domain first, then from the Agency slug in the subdomain.
_Avoid_: Impersonation, agency switch, tenant header

**Agency User**:
A user who belongs to exactly one Agency and can only act inside it. Every non-Platform-Admin user is an Agency User.
_Avoid_: Tenant user, member, regular user

**Platform Admin**:
A user who belongs to no Agency and therefore has no Current Agency of their own. Membership in no Agency *is* the definition — it is what the Admin Area gate tests, not a Group or a flag. See [Platform Administration](../platform-administration/CONTEXT.md).
_Avoid_: Superuser, root, Agency Admin, admin flag

**Agency Admin**:
An Agency User who administers their own Agency's workspace: its users, properties, branding, and subscription-facing settings. See [Platform Administration](../platform-administration/CONTEXT.md).
_Avoid_: Platform Admin, owner, system administrator

**Grupo (Group)**:
A named bundle of Permissions assigned to users — the only way a user acquires Permissions. "Grupos" is the product-facing name in the CRM.
_Avoid_: Role, perfil, cargo, permission set, team

**Permissão (Permission)**:
A single named capability that authorization is checked against, such as creating a property or managing Groups. Permissions are never granted to a user directly; they are reached through a Group.
_Avoid_: Ability, right, scope, feature flag

**Group Catalog**:
The **platform-wide** set of Groups and Permissions. There is exactly one catalog, shared by every Agency: Groups carry no `agency_id`, so a Group created inside one Agency is a Group of the whole platform. Group names are unique platform-wide.
_Avoid_: Agency groups, per-agency roles, tenant role catalog

**Grupo Administrador (Administrador Group)**:
The seeded Group that carries every CRM Permission and no Platform Permission — the Group given to an Initial Agency Admin. It is protected: it cannot be deleted.
_Avoid_: Admin role, Platform Admin, superuser group

**Grupo Corretor (Corretor Group)**:
The seeded Group intended for brokers. It is seeded with no Permissions; what a Corretor may do is decided by editing this Group.
_Avoid_: Default group, broker permissions, read-only group

**Grupo Platform Admin (Platform Admin Group)**:
The seeded Group that carries every Platform Permission and no CRM Permission. Distinct from a Platform Admin *user* — holding this Group grants nothing to a user who belongs to an Agency, and belonging to no Agency grants nothing without this Group's Permissions.
_Avoid_: Platform Admin (unqualified), admin group

**CRM Permission**:
A Permission governing an Agency's own workspace — its users, properties, valuations, subscriptions, and Group Catalog. Always evaluated against the Current Agency's data.
_Avoid_: Normal permission, user permission, tenant permission

**Platform Permission**:
A Permission governing the platform itself rather than any one Agency: Agency lifecycle and Crawler Operations. Named `platform.*` and `crawler.*`, and meaningful only to a Platform Admin — the Admin Area rejects an Agency User holding them.
_Avoid_: Admin permission, global permission, super permission

**Admin Area Gate**:
The check that admits a request to the platform-level Admin Area: the user must belong to no Agency **and** hold the specific Platform Permission for that operation. Neither half is sufficient alone.
_Avoid_: Admin middleware, is_admin check, role check

**Gerenciar Grupos (Manage Groups)**:
The permissioned capability to read, create, rename, re-permission, and delete Groups — that is, to edit the shared Group Catalog. Granted by `roles.manage`, which the Administrador Group holds and the Platform Admin Group does not.
_Avoid_: Admin access, manage permissions, manage users

**Serialized Permission Contract**:
The authenticated user's own capability list as the frontend receives it: the flattened Permission names reached through their Groups, plus whether they are a Platform Admin. It is the single input to every frontend permission check, so backend Permission renames are frontend-breaking changes.
_Avoid_: User payload, profile, session, ACL

**Deactivated Agency**:
An Agency a Platform Admin has switched off at the platform level. Deactivation preserves all data and is not deletion. See [Platform Administration](../platform-administration/CONTEXT.md).
_Avoid_: Deleted agency, cancelled subscription, suspended user

## Relationships

- An **Agency** owns many **Agency-Owned Records** and many **Agency Users**; an **Agency User** belongs to exactly one Agency.
- **Agency Scope** is what makes a record an **Agency-Owned Record**; it constrains queries to the **Current Agency** and applies no constraint when there is none.
- The **Current Agency** comes from an **Agency Host Override** when present, otherwise from the authenticated **Agency User**'s own Agency. A **Platform Admin** has no Current Agency.
- A user holds many **Grupos**; a **Grupo** grants many **Permissões**. A user's Permissions are exactly the union of their Groups' Permissions.
- Every **Grupo** and **Permissão** lives in the one platform-wide **Group Catalog**; no Group belongs to an Agency.
- **Gerenciar Grupos** authorizes editing the **Group Catalog**, therefore its effects are platform-wide rather than Agency-wide.
- The **Admin Area Gate** admits a request only when the user is a **Platform Admin** *and* holds the required **Platform Permission**.
- **CRM Permissions** are evaluated against the **Current Agency**; **Platform Permissions** are evaluated outside any Agency.
- The **Serialized Permission Contract** projects a user's **Grupos** and Agency membership to the frontend; frontend gates consume it and never re-derive it.
- A **Deactivated Agency** blocks the **White-Label Public Site**; it is a platform-level state, independent of any Permission.

## Flagged ambiguities

- **"Grupo" reads as Agency-scoped but is platform-wide.** The CRM presents "Grupos" inside an Agency's workspace, which invites the reading that each Agency has its own Groups. It does not: there is one **Group Catalog**. Any statement about creating or editing a Group must say platform-wide, or say Agency-scoped only once the code actually scopes it.
- **"Platform Admin" names two things.** A user who belongs to no Agency, and a seeded **Grupo Platform Admin**. Always qualify which one is meant; a user can be one without the other, and the **Admin Area Gate** requires both.
- **"Administrador" suggests total authority.** The **Grupo Administrador** deliberately holds no **Platform Permission**. An "administrator" in this system administers one Agency, not the platform.
- **"Permission" vs. gating that is not a Permission.** Agency membership, **Deactivated Agency** status, and subscription state gate requests without being Permissions. Describing them as permissions hides that no Group change can grant or revoke them.
- **"Tenant" is retired vocabulary** (ADR-0006). It still appears in conversation as shorthand for Agency; it should not appear in code, docs, or output.

## Enforcement gaps

The documented model above is the intended contract. Points where the code does not yet enforce it are tracked in [enforcement-gaps.md](./enforcement-gaps.md).
