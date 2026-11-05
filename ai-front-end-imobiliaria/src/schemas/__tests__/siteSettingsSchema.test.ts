import { describe, expect, it } from "vitest";

import { siteSettingsErrors } from "../siteSettingsSchema";

describe("siteSettingsErrors", () => {
    it("accepts empty optional fields and valid formats", () => {
        expect(
            siteSettingsErrors({
                logo_path: "/logo.png",
                color_primary: "#1A2B3C",
                default_whatsapp: "(47) 99999-0000",
                facebook_url: "https://facebook.com/pagina",
                instagram_url: null,
                google_analytics_id: "G-ABC123",
                meta_pixel_id: "123456789",
            }),
        ).toEqual({});
    });

    it("flags bad colors, phones, URLs and tracking ids", () => {
        const errors = siteSettingsErrors({
            color_primary: "azul",
            default_whatsapp: "9999",
            facebook_url: "facebook.com/pagina",
            google_analytics_id: "123",
            meta_pixel_id: "abc",
        });

        expect(Object.keys(errors).sort()).toEqual(
            ["color_primary", "default_whatsapp", "facebook_url", "google_analytics_id", "meta_pixel_id"].sort(),
        );
    });
});
