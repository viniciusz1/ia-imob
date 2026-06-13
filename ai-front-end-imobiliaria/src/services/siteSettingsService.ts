import api, { API_PREFIX } from "./api";

const BASE_PATH = `${API_PREFIX}/site-settings`;

/**
 * Flat, form-friendly model consumed by the settings panel.
 *
 * NOTE: the backend `SiteSettingsResource` returns a *nested* shape
 * (palette/contact/analytics/content) shared with the public site API,
 * while the update endpoint validates *flat* keys. We map nested -> flat
 * on read and keep the flat payload on write.
 */
export interface SiteSettingsData {
    theme_slug: string;
    logo_path: string | null;
    favicon_path: string | null;
    color_primary: string;
    color_secondary: string;
    color_accent: string;
    color_bg: string;
    color_surface: string;
    color_text: string;
    color_muted: string;
    default_whatsapp: string | null;
    facebook_url: string | null;
    instagram_url: string | null;
    google_analytics_id: string | null;
    meta_pixel_id: string | null;
    hero_title: string | null;
    hero_subtitle: string | null;
    about_text: string | null;
}

export interface SiteSettingsPayload {
    logo_path?: string | null;
    favicon_path?: string | null;
    color_primary?: string;
    color_secondary?: string;
    color_accent?: string;
    color_bg?: string;
    color_surface?: string;
    color_text?: string;
    color_muted?: string;
    default_whatsapp?: string | null;
    facebook_url?: string | null;
    instagram_url?: string | null;
    google_analytics_id?: string | null;
    meta_pixel_id?: string | null;
    hero_title?: string | null;
    hero_subtitle?: string | null;
    about_text?: string | null;
}

/** The nested branding shape returned by `SiteSettingsResource` on the backend. */
interface ApiSiteSettings {
    theme_slug: string;
    logo: string | null;
    favicon: string | null;
    palette: {
        primary: string;
        secondary: string;
        accent: string;
        bg: string;
        surface: string;
        text: string;
        muted: string;
    };
    contact: {
        whatsapp: string | null;
        facebook: string | null;
        instagram: string | null;
    };
    analytics: {
        google_analytics_id: string | null;
        meta_pixel_id: string | null;
    };
    content: {
        hero_title: string | null;
        hero_subtitle: string | null;
        about_text: string | null;
    };
}

type SiteSettingsResponse = { data: ApiSiteSettings };

function toFlat(api: ApiSiteSettings): SiteSettingsData {
    return {
        theme_slug: api.theme_slug,
        logo_path: api.logo,
        favicon_path: api.favicon,
        color_primary: api.palette.primary,
        color_secondary: api.palette.secondary,
        color_accent: api.palette.accent,
        color_bg: api.palette.bg,
        color_surface: api.palette.surface,
        color_text: api.palette.text,
        color_muted: api.palette.muted,
        default_whatsapp: api.contact.whatsapp,
        facebook_url: api.contact.facebook,
        instagram_url: api.contact.instagram,
        google_analytics_id: api.analytics.google_analytics_id,
        meta_pixel_id: api.analytics.meta_pixel_id,
        hero_title: api.content.hero_title,
        hero_subtitle: api.content.hero_subtitle,
        about_text: api.content.about_text,
    };
}

export async function getSiteSettings(): Promise<SiteSettingsData> {
    const { data } = await api.get<SiteSettingsResponse>(BASE_PATH);
    return toFlat(data.data);
}

export async function updateSiteSettings(payload: SiteSettingsPayload): Promise<SiteSettingsData> {
    const { data } = await api.put<SiteSettingsResponse>(BASE_PATH, payload);
    return toFlat(data.data);
}
