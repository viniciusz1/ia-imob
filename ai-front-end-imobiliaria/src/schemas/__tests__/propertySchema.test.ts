import { describe, expect, it } from "vitest";
import { propertySchema } from "../property";

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
});
