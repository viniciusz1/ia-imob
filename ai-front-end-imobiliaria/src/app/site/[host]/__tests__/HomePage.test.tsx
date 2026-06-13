import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../page";
import { getBranding, listProperties } from "@/services/public/publicApi";
import type { LinkablePublicPropertySummary, SiteBranding } from "@/services/public/types";

const router = vi.hoisted(() => ({
    push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => router,
}));

vi.mock("next/link", () => ({
    default: ({
        href,
        children,
        ...props
    }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

vi.mock("@/services/public/publicApi", () => ({
    getBranding: vi.fn(),
    listProperties: vi.fn(),
}));

const getBrandingMock = vi.mocked(getBranding);
const listPropertiesMock = vi.mocked(listProperties);

const branding: SiteBranding = {
    name: "Acme Imóveis",
    slug: "acme",
    theme_slug: "classic",
    logo: null,
    favicon: null,
    palette: {
        primary: "#123456",
        secondary: "#0ea5e9",
        accent: "#f59e0b",
        bg: "#ffffff",
        surface: "#f8fafc",
        text: "#0f172a",
        muted: "#64748b",
    },
    contact: {
        whatsapp: null,
        facebook: null,
        instagram: null,
    },
    analytics: {
        google_analytics_id: null,
        meta_pixel_id: null,
    },
    content: {
        hero_title: "Imóveis selecionados pela Acme",
        hero_subtitle: "Comprar ou alugar com atendimento local.",
        about_text: null,
    },
};

const highlightedProperty: LinkablePublicPropertySummary = {
    slug: "venda-casa-centro-ref-ca1234",
    reference_code: "CA1234",
    title: "Casa no Centro",
    property_type: "casa",
    purpose: "venda",
    is_highlighted: true,
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

describe("HomePage", () => {
    beforeEach(() => {
        getBrandingMock.mockReset();
        listPropertiesMock.mockReset();
        router.push.mockClear();
    });

    it("renders branded hero, search entry, and highlighted properties", async () => {
        getBrandingMock.mockResolvedValue(branding);
        listPropertiesMock.mockResolvedValue({
            data: [highlightedProperty],
        });

        const page = await HomePage({
            params: Promise.resolve({ host: "acme.localhost" }),
        });

        render(page);

        expect(screen.getByRole("heading", { name: "Imóveis selecionados pela Acme" })).toBeInTheDocument();
        expect(screen.getByText("Comprar ou alugar com atendimento local.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Comprar" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Alugar" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Imóveis em destaque" })).toBeInTheDocument();
        expect(screen.getByText("Casa no Centro")).toBeInTheDocument();
        expect(listPropertiesMock).toHaveBeenCalledWith("acme.localhost", { is_highlighted: 1, per_page: 6 });
    });
});
