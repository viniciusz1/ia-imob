export const SITE_TEMPLATES = [
    {
        slug: "classic",
        name: "Clássico",
        description: "Busca centralizada, lista de destaques em grade e navegação simples.",
    },
    {
        slug: "showcase",
        name: "Vitrine editorial",
        description: "Hero visual com imóvel em destaque e chamada mais forte para a busca.",
    },
] as const;

export type SiteTemplateSlug = (typeof SITE_TEMPLATES)[number]["slug"];

export const DEFAULT_SITE_TEMPLATE: SiteTemplateSlug = "classic";

export function isSiteTemplateSlug(value: string | null | undefined): value is SiteTemplateSlug {
    return SITE_TEMPLATES.some((template) => template.slug === value);
}

export function normalizeSiteTemplateSlug(value: string | null | undefined): SiteTemplateSlug {
    return isSiteTemplateSlug(value) ? value : DEFAULT_SITE_TEMPLATE;
}
