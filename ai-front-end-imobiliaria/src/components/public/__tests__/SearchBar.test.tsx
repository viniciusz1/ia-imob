import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "../SearchBar";

const router = vi.hoisted(() => ({
    push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useRouter: () => router,
}));

describe("SearchBar", () => {
    beforeEach(() => {
        router.push.mockClear();
    });

    it("renders the purchase and rental modes", () => {
        render(<SearchBar />);

        expect(screen.getByRole("button", { name: "Comprar" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Alugar" })).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByLabelText("Buscar imóveis")).toHaveAttribute("placeholder", "Bairro, cidade ou código do imóvel");
    });

    it("navigates to public results with the selected purpose and search text", () => {
        render(<SearchBar />);

        fireEvent.click(screen.getByRole("button", { name: "Alugar" }));
        fireEvent.change(screen.getByLabelText("Buscar imóveis"), {
            target: { value: "Centro" },
        });
        fireEvent.click(screen.getByRole("button", { name: "Buscar" }));

        expect(router.push).toHaveBeenCalledWith("/imoveis?purpose=locacao&search=Centro");
    });
});
