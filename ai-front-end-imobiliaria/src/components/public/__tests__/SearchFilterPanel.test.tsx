import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchFilterPanel } from "../SearchFilterPanel";
import type { PropertyFilters } from "@/services/public/types";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: mockPush, replace: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => "/imoveis",
}));

describe("SearchFilterPanel", () => {
    const baseFilters: PropertyFilters = { purpose: "venda" };

    beforeEach(() => {
        mockPush.mockClear();
    });

    it("renders property type options and price inputs", () => {
        render(<SearchFilterPanel currentFilters={baseFilters} />);

        expect(screen.getByLabelText("Tipo de imóvel")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Preço mínimo")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Preço máximo")).toBeInTheDocument();
    });

    it("renders bedroom and bathroom selects", () => {
        render(<SearchFilterPanel currentFilters={baseFilters} />);

        expect(screen.getByLabelText("Quartos")).toBeInTheDocument();
        expect(screen.getByLabelText("Banheiros")).toBeInTheDocument();
    });

    it("navigates with updated filters when property type changes", () => {
        render(<SearchFilterPanel currentFilters={{ purpose: "venda" }} />);

        fireEvent.change(screen.getByLabelText("Tipo de imóvel"), {
            target: { value: "casa" },
        });

        expect(mockPush).toHaveBeenCalledWith(
            expect.stringContaining("property_type=casa"),
        );
    });

    it("preserves existing filters when adding a new one", () => {
        render(<SearchFilterPanel currentFilters={{ purpose: "venda", city: "Itajaí" }} />);

        fireEvent.change(screen.getByLabelText("Tipo de imóvel"), {
            target: { value: "apartamento" },
        });

        const url = mockPush.mock.calls[0][0] as string;
        expect(url).toContain("purpose=venda");
        expect(url).toContain("city=Itaja%C3%AD");
        expect(url).toContain("property_type=apartamento");
    });
});
