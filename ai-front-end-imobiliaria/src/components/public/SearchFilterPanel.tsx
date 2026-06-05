"use client";

import { useRouter } from "next/navigation";
import type { PropertyFilters } from "@/services/public/types";

const PROPERTY_TYPES = [
    { value: "", label: "Todos" },
    { value: "apartamento", label: "Apartamento" },
    { value: "casa", label: "Casa" },
    { value: "terreno", label: "Terreno" },
    { value: "comercial", label: "Comercial" },
    { value: "rural", label: "Rural" },
];

const NUMBER_OPTIONS = [
    { value: "", label: "Todos" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4+", label: "4+" },
];

interface Props {
    currentFilters: PropertyFilters;
}

export function SearchFilterPanel({ currentFilters }: Props) {
    const router = useRouter();

    function updateFilter(key: string, value: string) {
        const params = new URLSearchParams();

        // Preserve existing filters
        for (const [k, v] of Object.entries(currentFilters)) {
            if (v !== undefined && v !== null && v !== "" && k !== key) {
                params.set(k, String(v));
            }
        }

        // Set new value (skip if empty)
        if (value) {
            params.set(key, value);
        }

        router.push(`/imoveis?${params.toString()}`);
    }

    const f = currentFilters;

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-xl bg-[var(--brand-surface)] p-4">
            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--brand-muted)]">Tipo de imóvel</span>
                <select
                    value={(f.property_type as string) ?? ""}
                    onChange={(e) => updateFilter("property_type", e.target.value)}
                    className="rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                >
                    {PROPERTY_TYPES.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--brand-muted)]">Quartos</span>
                <select
                    value={(f.bedrooms as string) ?? ""}
                    onChange={(e) => updateFilter("bedrooms", e.target.value)}
                    className="rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                >
                    {NUMBER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--brand-muted)]">Banheiros</span>
                <select
                    value={(f.bathrooms as string) ?? ""}
                    onChange={(e) => updateFilter("bathrooms", e.target.value)}
                    className="rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                >
                    {NUMBER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--brand-muted)]">Preço</span>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Preço mínimo"
                        value={(f.min_price as string) ?? ""}
                        onChange={(e) => updateFilter("min_price", e.target.value)}
                        className="w-28 rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                    />
                    <span className="text-xs text-[var(--brand-muted)]">até</span>
                    <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Preço máximo"
                        value={(f.max_price as string) ?? ""}
                        onChange={(e) => updateFilter("max_price", e.target.value)}
                        className="w-28 rounded-lg border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-3 py-2 text-sm text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                    />
                </div>
            </label>
        </div>
    );
}
