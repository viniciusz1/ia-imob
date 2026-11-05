import { z } from "zod";

import { isHttpUrl, isValidPhoneBR } from "@/lib/brazilianFormats";

// Mirrors SiteSettingsController::update (all fields optional / nullable) and
// adds the formats the public site actually needs to work.

const HEX_COLOR = /^#([0-9a-fA-F]{3,8})$/;

const optionalText = (label: string, max: number) =>
    z.string().max(max, `${label} deve ter no máximo ${max} caracteres`).nullable().optional();

/** Logo/favicon: a full http(s) address or a path served by the site ("/logo.png"). */
const optionalAsset = (label: string) =>
    z
        .string()
        .max(2048, `${label} deve ter no máximo 2048 caracteres`)
        .refine(
            (value) => value === "" || value.startsWith("/") || isHttpUrl(value),
            "Informe um endereço completo (https://…) ou um caminho começando com /",
        )
        .nullable()
        .optional();

const optionalUrl = (label: string) =>
    z
        .string()
        .max(255, `${label} deve ter no máximo 255 caracteres`)
        .refine((value) => value === "" || isHttpUrl(value), `${label} deve ser um endereço completo, como https://site.com.br`)
        .nullable()
        .optional();

const color = z.string().regex(HEX_COLOR, "Use uma cor hexadecimal, como #1A2B3C").nullable().optional();

export const siteSettingsSchema = z.object({
    logo_path: optionalAsset("URL do logotipo"),
    favicon_path: optionalAsset("URL do favicon"),
    color_primary: color,
    color_secondary: color,
    color_accent: color,
    color_bg: color,
    color_surface: color,
    color_text: color,
    color_muted: color,
    default_whatsapp: z
        .string()
        .refine((value) => value === "" || isValidPhoneBR(value), "Informe um WhatsApp com DDD, como (47) 99999-0000")
        .nullable()
        .optional(),
    facebook_url: optionalUrl("Facebook"),
    instagram_url: optionalUrl("Instagram"),
    google_analytics_id: z
        .string()
        .max(50, "O ID do Google Analytics deve ter no máximo 50 caracteres")
        .refine((value) => value === "" || /^(G|GT|AW)-[A-Z0-9]+$|^UA-\d+-\d+$/i.test(value), "Use um ID como G-XXXXXXXXXX")
        .nullable()
        .optional(),
    meta_pixel_id: z
        .string()
        .max(50, "O ID do Meta Pixel deve ter no máximo 50 caracteres")
        .refine((value) => value === "" || /^\d+$/.test(value), "O ID do Meta Pixel tem apenas números")
        .nullable()
        .optional(),
    hero_title: optionalText("Título do hero", 255),
    hero_subtitle: optionalText("Subtítulo do hero", 255),
    about_text: optionalText("Sobre a imobiliária", 5000),
});

export type SiteSettingsField = keyof z.infer<typeof siteSettingsSchema>;

/** Field → first error message for the current values. */
export function siteSettingsErrors(values: unknown): Partial<Record<SiteSettingsField, string>> {
    const result = siteSettingsSchema.safeParse(values);
    if (result.success) return {};
    const errors: Partial<Record<SiteSettingsField, string>> = {};
    for (const issue of result.error.issues) {
        const field = issue.path[0] as SiteSettingsField | undefined;
        if (field && !errors[field]) errors[field] = issue.message;
    }
    return errors;
}
