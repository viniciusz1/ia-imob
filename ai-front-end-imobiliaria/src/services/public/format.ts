import type { Money, PublicPropertyLocation, PublicPropertyPricing } from "./types";

const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
});

function toNumber(value: Money | undefined): number | null {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const n = typeof value === "string" ? Number(value) : value;
    return Number.isFinite(n) ? n : null;
}

export function formatBRL(value: Money | undefined): string {
    const n = toNumber(value);
    return n === null ? "Sob consulta" : BRL.format(n);
}

/** Headline price for a property, honoring the show_price privacy flag. */
export function priceLabel(pricing: PublicPropertyPricing): string {
    if (!pricing.show_price) {
        return "Sob consulta";
    }
    const value = toNumber(pricing.sale_price) ?? toNumber(pricing.rent_price);
    return value === null ? "Sob consulta" : BRL.format(value);
}

export function formatArea(area: Money | undefined): string | null {
    const n = toNumber(area);
    return n === null ? null : `${n.toLocaleString("pt-BR")} m²`;
}

export function locationLabel(location: PublicPropertyLocation): string {
    return [location.neighborhood, location.city].filter(Boolean).join(", ");
}

export function purposeLabel(purpose: string): string {
    return purpose === "locacao" ? "Alugar" : "Comprar";
}
