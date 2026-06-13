# Platform Administration

Internal system administration for managing the platform's customer Agencies and platform-level access. This context is separate from an Agency's own CRM administration.

## Language

**Platform Admin**:
An internal platform user who can manage Agencies and platform-level configuration across the system. A Platform Admin does not belong to an Agency by default and can view, create, update, activate, and deactivate Agencies.
_Avoid_: Agency Admin, Broker, Tenant user

**Agency Admin**:
A user who administers only their own Agency's CRM workspace, users, properties, branding, and subscription-facing settings.
_Avoid_: Platform Admin, system administrator, Tenant admin

**Initial Agency Admin**:
The first Agency Admin created with a new Agency so that the Agency is usable immediately after registration. In v1, the Platform Admin sets this user's initial password during Agency Registration.
_Avoid_: Owner user, primary contact, first broker, invitation-only admin

**Agency**:
A real estate agency that is a customer of the platform and owns its users, properties, leads, branding, subscription, and public site.
_Avoid_: Tenant, Source Agency, account, customer

**Agency Registration**:
The Platform Admin workflow that creates a new Agency together with its Initial Agency Admin. In v1, registration captures only the minimum Agency identity/contact fields and the Initial Agency Admin credentials.
_Avoid_: Tenant creation, account signup, agency config

**Agency Status**:
The platform-level state that determines whether an Agency can use the CRM and public site. In v1, Platform Admins can activate or deactivate an Agency but do not delete Agencies; deactivation blocks use while preserving data.
_Avoid_: Subscription status, deletion, billing state

**Admin Area**:
The platform-level administration area used by Platform Admins, separate from the agency-scoped CRM dashboard.
_Avoid_: CRM dashboard, agency settings, backoffice

## Relationships

- A **Platform Admin** can manage many **Agencies**.
- An **Agency Admin** belongs to exactly one **Agency**.
- A **Platform Admin** is not an **Agency Admin** unless explicitly assigned to an Agency.
- **Agency Registration** creates one **Agency** and one **Initial Agency Admin** together.
- The **Admin Area** is only for **Platform Admins** and is separate from the Agency-scoped CRM.
