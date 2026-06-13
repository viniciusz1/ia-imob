import { beforeEach, describe, expect, it, vi } from "vitest";

import { getSiteSettings, updateSiteSettings } from "../siteSettingsService";
import api from "../api";

vi.mock("../api", () => ({
    default: { get: vi.fn(), put: vi.fn() },
    API_PREFIX: "/api/v1",
}));

// The backend `SiteSettingsResource` returns this *nested* shape, wrapped in `data`.
const nested = {
    theme_slug: "classic",
    logo: null,
    favicon: null,
    palette: {
        primary: "#1e3a8a",
        secondary: "#0ea5e9",
        accent: "#f59e0b",
        bg: "#ffffff",
        surface: "#f8fafc",
        text: "#0f172a",
        muted: "#64748b",
    },
    contact: {
        whatsapp: "(47) 99999-0001",
        facebook: "https://facebook.com/imobiliariademo",
        instagram: "https://instagram.com/imobiliariademo",
    },
    analytics: { google_analytics_id: null, meta_pixel_id: null },
    content: {
        hero_title: "Encontre o imóvel dos seus sonhos",
        hero_subtitle: "Os melhores imóveis de Itajaí e região.",
        about_text: "Sobre a Imobiliária Demo.",
    },
};

beforeEach(() => {
    vi.mocked(api.get).mockReset();
    vi.mocked(api.put).mockReset();
});

describe("siteSettingsService", () => {
    it("maps the nested branding resource to the flat form model on read", async () => {
        vi.mocked(api.get).mockResolvedValue({ data: { data: nested } });

        const settings = await getSiteSettings();

        expect(api.get).toHaveBeenCalledWith("/api/v1/site-settings");
        // Regression: these flat keys used to come back `undefined` because the
        // service returned the nested resource verbatim (palette.primary, etc.).
        expect(settings.color_primary).toBe("#1e3a8a");
        expect(settings.color_muted).toBe("#64748b");
        expect(settings.default_whatsapp).toBe("(47) 99999-0001");
        expect(settings.facebook_url).toBe("https://facebook.com/imobiliariademo");
        expect(settings.hero_title).toBe("Encontre o imóvel dos seus sonhos");
        expect(settings.logo_path).toBeNull();
        expect(settings.theme_slug).toBe("classic");
    });

    it("sends a flat payload and maps the nested response back to flat on update", async () => {
        vi.mocked(api.put).mockResolvedValue({
            data: { data: { ...nested, palette: { ...nested.palette, primary: "#112233" } } },
        });

        const updated = await updateSiteSettings({ color_primary: "#112233" });

        expect(api.put).toHaveBeenCalledWith("/api/v1/site-settings", { color_primary: "#112233" });
        expect(updated.color_primary).toBe("#112233");
    });
});
