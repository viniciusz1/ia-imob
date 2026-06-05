import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PropertyDetail } from "../PropertyDetail";
import type { PublicPropertyDetail } from "@/services/public/types";

vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: any) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

function makeDetail(overrides: Partial<PublicPropertyDetail> = {}): PublicPropertyDetail {
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
            floor_number: 5,
            total_floors: 10,
            build_year: 2018,
        },
        location: {
            city: "Itajaí",
            neighborhood: "Centro",
            show_exact_address: true,
            street: "Rua Exemplo",
        },
        pricing: {
            show_price: true,
            sale_price: 500000,
            rent_price: null,
            accepts_financing: true,
            accepts_exchange: false,
        },
        cover_image: "https://cdn.example.com/cover.jpg",
        description: "Lindo apartamento com vista para o mar.",
        media: {
            video_url: null,
            virtual_tour_url: null,
            images: [
                { url: "https://cdn.example.com/1.jpg", is_cover: true, description: "Sala" },
                { url: "https://cdn.example.com/2.jpg", is_cover: false, description: "Quarto" },
            ],
        },
        features: ["Piscina", "Churrasqueira", "Elevador"],
        broker: {
            name: "João Silva",
            creci: "12345-F",
            phone: "(47) 99999-0000",
            avatar: null,
            facebook_link: null,
            instagram_link: null,
            description: "Especialista em imóveis de alto padrão.",
        },
        ...overrides,
    };
}

describe("PropertyDetail", () => {
    it("renders title, price, and purpose label", () => {
        render(<PropertyDetail property={makeDetail()} />);

        expect(screen.getByText("Apartamento no Centro")).toBeInTheDocument();
        expect(screen.getByText("Comprar")).toBeInTheDocument();
        expect(screen.getByText(/R\$\s?500\.000/)).toBeInTheDocument();
    });

    it("renders characteristics grid", () => {
        render(<PropertyDetail property={makeDetail()} />);

        // Characteristics are displayed with their labels
        expect(screen.getByText("Quartos")).toBeInTheDocument();
        expect(screen.getByText("Banheiros")).toBeInTheDocument();
        expect(screen.getByText("Vagas")).toBeInTheDocument();
        expect(screen.getByText("90 m²")).toBeInTheDocument();
        expect(screen.getByText("Suítes")).toBeInTheDocument();
    });

    it("renders property description", () => {
        render(<PropertyDetail property={makeDetail()} />);

        expect(screen.getByText("Lindo apartamento com vista para o mar.")).toBeInTheDocument();
    });

    it("renders features list", () => {
        render(<PropertyDetail property={makeDetail()} />);

        expect(screen.getByText("Piscina")).toBeInTheDocument();
        expect(screen.getByText("Churrasqueira")).toBeInTheDocument();
        expect(screen.getByText("Elevador")).toBeInTheDocument();
    });

    it("renders broker info", () => {
        render(<PropertyDetail property={makeDetail()} />);

        expect(screen.getByText("João Silva")).toBeInTheDocument();
        expect(screen.getByText("CRECI: 12345-F")).toBeInTheDocument();
    });

    it('shows "Sob consulta" when price is hidden', () => {
        const property = makeDetail({
            pricing: {
                show_price: false,
                sale_price: 500000,
                rent_price: null,
                accepts_financing: false,
                accepts_exchange: false,
            },
        });

        render(<PropertyDetail property={property} />);

        expect(screen.getByText("Sob consulta")).toBeInTheDocument();
        expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    });

    it("renders approximate location note when address is hidden", () => {
        const property = makeDetail({
            location: {
                city: "Itajaí",
                neighborhood: "Centro",
                show_exact_address: false,
            },
        });

        render(<PropertyDetail property={property} />);

        expect(screen.getByText(/localização aproximada/i)).toBeInTheDocument();
    });
});
