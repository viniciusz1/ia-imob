import api, { API_PREFIX } from "./api";

const BASE_PATH = `${API_PREFIX}/site-settings`;

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
    created_at: string | null;
    updated_at: string | null;
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

type SiteSettingsResponse = { data: SiteSettingsData };

export async function getSiteSettings(): Promise<SiteSettingsData> {
    const { data } = await api.get<SiteSettingsResponse>(BASE_PATH);
    return data.data;
}

export async function updateSiteSettings(payload: SiteSettingsPayload): Promise<SiteSettingsData> {
    const { data } = await api.put<SiteSettingsResponse>(BASE_PATH, payload);
    return data.data;
}
