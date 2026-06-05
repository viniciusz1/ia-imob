# White-Label Public Site

The public, search-engine-facing storefront where a real estate agency's own published properties are shown to final clients (buyers) under the agency's own brand and domain. This is a separate read surface from the internal CRM and from the market-wide AI Searcher.

## Language

**Tenant**:
A real estate agency that is a paying customer of the platform. First-class entity that owns its Users, Properties, leads, brand/site settings, and is the billing entity. Identified by `tenant_id`.
_Avoid_: Imobiliária (ambiguous — see Source Agency), client, account, customer

**Broker**:
A CRM `User` (a property-seller/agent) belonging to exactly one Tenant. Lists and sells properties and may appear on the Tenant's public site via a personal profile (photo, CRECI, social links).
_Avoid_: User (too generic in public context), realtor, salesperson

**Source Agency**:
A real estate company whose website is scraped for listings (the meaning of "Imobiliária" in the [Imobscrapy](../../../imobscrapy/CONTEXT.md) context). A Source Agency is *not* a Tenant and never publishes to a white-label site.
_Avoid_: Tenant, customer

**Final Client**:
An anonymous public visitor (a buyer) who browses and searches a Tenant's white-label site. Not authenticated, not a CRM user.
_Avoid_: User, customer, lead (a Final Client only becomes a lead after submitting interest)

**White-Label Site**:
The public Next.js storefront for one Tenant, rendered with that Tenant's branding (logo, colors, domain) from a shared template.
_Avoid_: Landing page, microsite, portal

**Template**:
A shared, reusable public-site layout selected per Tenant via `theme_slug`. The same Template re-skins for each Tenant through their Branding; it contains no tenant-specific code. v1 ships exactly one Template.
_Avoid_: Theme (reserved for the `theme_slug` identifier), skin, layout

**Branding**:
A Tenant's visual identity applied to the Template: logo, favicon, a semantic color palette (primary, secondary, accent, bg, surface, text, muted) injected as CSS variables, plus default WhatsApp number, social links, and analytics IDs. Stored 1:1 in `tenant_site_settings`.
_Avoid_: Theme, customization, config

**Published Property**:
A `Property` record (the CRM-owned inventory model — never `ScrapyProperty`) whose `is_published = true`. Only Published Properties appear on a White-Label Site.
_Avoid_: Listing, ad, scraped property

**Lead**:
A Final Client's submitted interest, captured by the public contact form and stored tenant-scoped (`tenant_id`, optional `property_id`, name, phone, email, message, source, status). Distinct from the WhatsApp deep-link, which is instant contact that produces no Lead.
_Avoid_: Contact, inquiry, message

## Relationships

- A **Tenant** has many **Brokers**, many **Published Properties**, one **Branding**, and exactly one **White-Label Site**.
- A **White-Label Site** shows only that Tenant's **Published Properties** (`Property`, never `ScrapyProperty`) and is served only while the Tenant's subscription is active.
- A **Final Client** searches one Tenant's **White-Label Site** at a time and becomes a **Lead** by submitting the contact form.
- A **Lead** belongs to one **Tenant** and optionally references one **Published Property** (and the listing **Broker**).

## Flagged ambiguities

- "Imobiliária" means two different things across contexts: in Imobscrapy it is a **Source Agency** (a scrape target); here it is a **Tenant** (a paying customer who publishes). These never overlap.
