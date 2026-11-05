import { describe, expect, it } from "vitest";
import { propertySchema } from "../propertySchema";

const validPayload = {
    reference_code: "REF-001",
    title: "Apartamento moderno no centro",
    description: "Excelente opção para investimento",
    property_type: "apartamento",
    purpose: "venda",
    status: "disponivel",
    usable_area: 85,
    total_area: 100,
    bedrooms: 2,
    suites: 1,
    bathrooms: 2,
    garage_spaces: 1,
    floor_number: 5,
    total_floors: 12,
    build_year: 2022,
    features: [1, 2],
    sale_price: 550000,
    rent_price: null,
    property_tax: 1200,
    condo_fee: 600,
    accepts_financing: true,
    accepts_exchange: false,
    show_price: true,
    zip_code: "01310100",
    street: "Avenida Paulista",
    number: "1000",
    complement: null,
    neighborhood: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    latitude: -23.561684,
    longitude: -46.655981,
    show_exact_address: true,
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    virtual_tour_url: null,
    broker_id: 1,
    owner_id: 2,
    is_published: true,
    is_highlighted: false,
    has_exclusive_right: false,
    exclusive_right_expiration_date: null,
    keys_location: null,
    internal_notes: null,
};

describe("Property schema validation", () => {
    it("fails when title is too short", () => {
        const result = propertySchema.safeParse({
            ...validPayload,
            title: "abc",
        });

        expect(result.success).toBe(false);
    });

    it("fails when exclusivity is enabled but expiration date is missing", () => {
        const result = propertySchema.safeParse({
            ...validPayload,
            has_exclusive_right: true,
            exclusive_right_expiration_date: null,
        });

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toEqual(["exclusive_right_expiration_date"]);
        }
    });

    it("passes with a valid payload", () => {
        const result = propertySchema.safeParse(validPayload);
        expect(result.success).toBe(true);
    });

    it("requires bedrooms, bathrooms and parking spaces to be informed", () => {
        const result = propertySchema.safeParse({ ...validPayload, bedrooms: null, bathrooms: null, garage_spaces: null });

        expect(result.success).toBe(false);
        const messages = result.success ? [] : result.error.issues.map((issue) => issue.message);
        expect(messages).toEqual(
            expect.arrayContaining([
                "Informe a quantidade de quartos",
                "Informe a quantidade de banheiros",
                "Informe a quantidade de vagas",
            ]),
        );
    });

    it("accepts zero bedrooms when informed (e.g. a plot)", () => {
        expect(propertySchema.safeParse({ ...validPayload, bedrooms: 0, suites: 0 }).success).toBe(true);
    });

    it("requires a usable area greater than zero and accepts large areas", () => {
        expect(propertySchema.safeParse({ ...validPayload, usable_area: null }).success).toBe(false);
        expect(propertySchema.safeParse({ ...validPayload, usable_area: 0 }).success).toBe(false);
        expect(propertySchema.safeParse({ ...validPayload, usable_area: 20000, total_area: 25000 }).success).toBe(true);
    });

    it("limits the construction year to ten years ahead", () => {
        const year = new Date().getFullYear();

        expect(propertySchema.safeParse({ ...validPayload, build_year: year + 10 }).success).toBe(true);
        expect(propertySchema.safeParse({ ...validPayload, build_year: year + 11 }).success).toBe(false);
        expect(propertySchema.safeParse({ ...validPayload, build_year: 1799 }).success).toBe(false);
    });

    it("requires the price that matches the purpose", () => {
        expect(propertySchema.safeParse({ ...validPayload, purpose: "venda", sale_price: null }).success).toBe(false);
        expect(
            propertySchema.safeParse({ ...validPayload, purpose: "locacao", sale_price: null, rent_price: null }).success,
        ).toBe(false);
        expect(
            propertySchema.safeParse({ ...validPayload, purpose: "locacao", sale_price: null, rent_price: 2500 }).success,
        ).toBe(true);
    });

    it("rejects more suites than bedrooms and a total area below the usable area", () => {
        expect(propertySchema.safeParse({ ...validPayload, bedrooms: 1, suites: 2 }).success).toBe(false);
        expect(propertySchema.safeParse({ ...validPayload, usable_area: 120, total_area: 100 }).success).toBe(false);
    });

    it("requires a CEP with 8 digits", () => {
        expect(propertySchema.safeParse({ ...validPayload, zip_code: "0131010" }).success).toBe(false);
        expect(propertySchema.safeParse({ ...validPayload, zip_code: "01310-100" }).success).toBe(true);
    });
});
