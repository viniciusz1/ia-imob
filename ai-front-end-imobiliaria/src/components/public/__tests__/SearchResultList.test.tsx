import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchResultList } from "../SearchResultList";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { Paginated, PublicPropertySummary } from "@/services/public/types";

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

function makeProperty(overrides: Partial<PublicPropertySummary> = {}): PublicPropertySummary {
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
        cover_image: null,
        ...overrides,
    };
}

function makePage(overrides: Partial<Paginated<PublicPropertySummary>> = {}): Paginated<PublicPropertySummary> {
    return {
        data: [],
        meta: { current_page: 1, last_page: 1, total: 0, per_page: 12 },
        ...overrides,
    };
}

describe("SearchResultList", () => {
    it("renders a PropertyCard for each result", () => {
        const page = makePage({
            data: [
                makeProperty({ slug: "ref-1", title: "Casa na Praia" }),
                makeProperty({ slug: "ref-2", title: "Apartamento moderno" }),
            ],
            meta: { current_page: 1, last_page: 1, total: 2, per_page: 12 },
        });

        render(<SearchResultList page={page} />);

        expect(screen.getByText("Casa na Praia")).toBeInTheDocument();
        expect(screen.getByText("Apartamento moderno")).toBeInTheDocument();
    });

    it("does not render properties without a slug", () => {
        const page = makePage({
            data: [
                makeProperty({ slug: "ref-1", title: "Casa na Praia" }),
                makeProperty({ slug: null, title: "Imóvel sem slug" }),
                makeProperty({ slug: "null", title: "Imóvel com slug null literal" }),
            ],
            meta: { current_page: 1, last_page: 1, total: 2, per_page: 12 },
        });

        render(<SearchResultList page={page} />);

        expect(screen.getByText("Casa na Praia")).toBeInTheDocument();
        expect(screen.queryByText("Imóvel sem slug")).not.toBeInTheDocument();
        expect(screen.queryByText("Imóvel com slug null literal")).not.toBeInTheDocument();
        expect(screen.queryByRole("link", { name: /Imóvel sem slug/i })).not.toBeInTheDocument();
    });

    it("shows empty state when no results", () => {
        render(<SearchResultList page={makePage()} />);

        expect(screen.getByText("Nenhum imóvel encontrado")).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("shows pagination when multiple pages exist", () => {
        const page = makePage({
            data: [makeProperty()],
            meta: { current_page: 2, last_page: 3, total: 25, per_page: 12 },
        });

        render(<SearchResultList page={page} />);

        // Pagination shows current page info
        expect(screen.getByText(/Página 2 de 3/)).toBeInTheDocument();
    });
});
