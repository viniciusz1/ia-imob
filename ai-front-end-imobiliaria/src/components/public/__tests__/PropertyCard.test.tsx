import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PropertyCard } from "../PropertyCard";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { LinkablePublicPropertySummary } from "@/services/public/types";

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

function makeProperty(overrides: Partial<LinkablePublicPropertySummary> = {}): LinkablePublicPropertySummary {
    return {
        slug: "venda-apartamento-3-quartos-centro-itajai-ref-ap1234",
        reference_code: "AP1234",
        title: "Apartamento no Centro",
        property_type: "apartamento",
        purpose: "venda",
        is_highlighted: false,
        characteristics: {
            bedrooms: 3,
            suites: 1,
            bathrooms: 2,
            garage_spaces: 2,
            usable_area: 90,
            total_area: 110,
        },
        location: { city: "Itajaí", neighborhood: "Centro", show_exact_address: true },
        pricing: {
            show_price: true,
            sale_price: 500000,
            rent_price: null,
            accepts_financing: true,
            accepts_exchange: false,
        },
        cover_image: "https://cdn.example.com/cover.jpg",
        ...overrides,
    };
}

describe("PropertyCard", () => {
    it("shows the formatted sale price and location", () => {
        render(<PropertyCard property={makeProperty()} />);

        expect(screen.getByText("Apartamento no Centro")).toBeInTheDocument();
        expect(screen.getByText("Centro, Itajaí")).toBeInTheDocument();
        expect(screen.getByText(/R\$\s?500\.000/)).toBeInTheDocument();
    });

    it('shows "Sob consulta" when the price is hidden', () => {
        const property = makeProperty({
            pricing: {
                show_price: false,
                sale_price: 500000,
                rent_price: null,
                accepts_financing: false,
                accepts_exchange: false,
            },
        });

        render(<PropertyCard property={property} />);

        expect(screen.getByText("Sob consulta")).toBeInTheDocument();
        expect(screen.queryByText(/R\$\s?500\.000/)).not.toBeInTheDocument();
    });

    it("links to the property detail page by slug", () => {
        render(<PropertyCard property={makeProperty()} />);

        expect(screen.getByRole("link")).toHaveAttribute(
            "href",
            "/imovel/venda-apartamento-3-quartos-centro-itajai-ref-ap1234",
        );
    });
});
