import { beforeEach, describe, expect, it, vi } from "vitest";
import robots from "../robots";
import sitemap from "../sitemap";
import { listProperties } from "@/services/public/publicApi";
import type { PublicPropertySummary } from "@/services/public/types";

const requestHeaders = vi.hoisted(() => ({
    get: vi.fn<(name: string) => string | null>(),
}));

vi.mock("next/headers", () => ({
    headers: () => Promise.resolve(requestHeaders),
}));

vi.mock("@/services/public/publicApi", () => ({
    listProperties: vi.fn(),
}));

const listPropertiesMock = vi.mocked(listProperties);

const property: PublicPropertySummary = {
    slug: "venda-casa-centro-ref-ca1234",
    reference_code: "CA1234",
    title: "Casa no Centro",
    property_type: "casa",
    purpose: "venda",
    is_highlighted: false,
    characteristics: {
        bedrooms: 3,
        suites: 1,
        bathrooms: 2,
        garage_spaces: 2,
        usable_area: 140,
        total_area: 220,
    },
    location: {
        city: "Itajaí",
        neighborhood: "Centro",
        show_exact_address: false,
    },
    pricing: {
        show_price: true,
        sale_price: 750000,
        rent_price: null,
        accepts_financing: true,
        accepts_exchange: false,
    },
    cover_image: null,
};

describe("public SEO routes", () => {
    beforeEach(() => {
        listPropertiesMock.mockReset();
        requestHeaders.get.mockImplementation((name: string) => {
            if (name === "host") {
                return "acme.localhost";
            }

            if (name === "x-forwarded-proto") {
                return "https";
            }

            return null;
        });
    });

    it("builds the sitemap for the requesting agency host", async () => {
        listPropertiesMock.mockResolvedValue({
            data: [property],
            meta: {
                current_page: 1,
                last_page: 1,
                total: 1,
                per_page: 100,
            },
        });

        const entries = await sitemap();

        expect(listPropertiesMock).toHaveBeenCalledWith("acme.localhost", { per_page: 100 });
        expect(entries).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ url: "https://acme.localhost" }),
                expect.objectContaining({ url: "https://acme.localhost/imoveis?purpose=venda" }),
                expect.objectContaining({ url: "https://acme.localhost/imoveis?purpose=locacao" }),
                expect.objectContaining({ url: "https://acme.localhost/imovel/venda-casa-centro-ref-ca1234" }),
            ]),
        );
    });

    it("serves robots.txt with the agency sitemap URL", async () => {
        await expect(robots()).resolves.toMatchObject({
            rules: {
                userAgent: "*",
                allow: "/",
                disallow: ["/site/", "/api/"],
            },
            sitemap: "https://acme.localhost/sitemap.xml",
        });
    });
});
