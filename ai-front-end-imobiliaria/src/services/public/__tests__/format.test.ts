import { describe, expect, it } from "vitest";
import { formatArea, formatBRL, locationLabel, priceLabel, purposeLabel } from "../format";

describe("public format helpers", () => {
    it("formats BRL without decimals", () => {
        expect(formatBRL(500000)).toMatch(/R\$\s?500\.000/);
    });

    it("returns Sob consulta for null/empty values", () => {
        expect(formatBRL(null)).toBe("Sob consulta");
        expect(formatBRL("")).toBe("Sob consulta");
    });

    it("priceLabel hides the price when show_price is false", () => {
        expect(
            priceLabel({
                show_price: false,
                sale_price: 500000,
                rent_price: null,
                accepts_financing: false,
                accepts_exchange: false,
            }),
        ).toBe("Sob consulta");
    });

    it("priceLabel coerces string decimals from the API", () => {
        expect(
            priceLabel({
                show_price: true,
                sale_price: "500000.00",
                rent_price: null,
                accepts_financing: false,
                accepts_exchange: false,
            }),
        ).toMatch(/R\$\s?500\.000/);
    });

    it("formats area and location", () => {
        expect(formatArea(90)).toBe("90 m²");
        expect(formatArea(null)).toBeNull();
        expect(locationLabel({ neighborhood: "Centro", city: "Itajaí", show_exact_address: true })).toBe(
            "Centro, Itajaí",
        );
    });

    it("labels purpose in pt-BR", () => {
        expect(purposeLabel("venda")).toBe("Comprar");
        expect(purposeLabel("locacao")).toBe("Alugar");
    });
});
