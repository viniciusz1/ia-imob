"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const PURPOSES = [
    { value: "venda", label: "Comprar" },
    { value: "locacao", label: "Alugar" },
];

export function SearchBar({ defaultPurpose = "venda" }: { defaultPurpose?: string }) {
    const router = useRouter();
    const [purpose, setPurpose] = useState(defaultPurpose);
    const [query, setQuery] = useState("");

    function submit(event: React.FormEvent) {
        event.preventDefault();
        const params = new URLSearchParams();
        params.set("purpose", purpose);
        if (query.trim()) {
            params.set("search", query.trim());
        }
        router.push(`/imoveis?${params.toString()}`);
    }

    return (
        <form onSubmit={submit} className="w-full max-w-2xl rounded-2xl bg-[var(--brand-surface)] p-2 shadow-lg">
            <div className="mb-2 flex gap-1 px-1">
                {PURPOSES.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => setPurpose(option.value)}
                        aria-pressed={purpose === option.value}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                            purpose === option.value
                                ? "bg-[var(--brand-primary)] text-white"
                                : "text-[var(--brand-muted)] hover:text-[var(--brand-primary)]"
                        }`}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-2">
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Bairro, cidade ou código do imóvel"
                    aria-label="Buscar imóveis"
                    className="flex-1 rounded-xl border border-[var(--brand-muted)]/20 bg-[var(--brand-bg)] px-4 py-3 text-[var(--brand-text)] outline-none focus:border-[var(--brand-primary)]"
                />
                <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-5 py-3 font-semibold text-white transition hover:opacity-90"
                >
                    <Search className="size-4" aria-hidden />
                    Buscar
                </button>
            </div>
        </form>
    );
}
