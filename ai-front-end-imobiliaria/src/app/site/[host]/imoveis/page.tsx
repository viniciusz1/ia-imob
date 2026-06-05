import type { Metadata } from "next";
import { listProperties } from "@/services/public/publicApi";
import { SearchBar } from "@/components/public/SearchBar";
import { SearchFilterPanel } from "@/components/public/SearchFilterPanel";
import { SearchResultList } from "@/components/public/SearchResultList";
import type { PropertyFilters } from "@/services/public/types";

export async function generateMetadata({
    params,
    searchParams,
}: {
    params: Promise<{ host: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
    const sp = await searchParams;
    const purpose = typeof sp.purpose === "string" ? sp.purpose : null;
    const title = purpose === "locacao" ? "Imóveis para alugar" : "Imóveis à venda";

    return {
        title,
        robots: { index: false, follow: true },
    };
}

export default async function SearchPage({
    params,
    searchParams,
}: {
    params: Promise<{ host: string }>;
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const { host } = await params;
    const sp = await searchParams;

    // Coerce multi-value params to string (Next.js can return string[])
    const filters: PropertyFilters = {};
    for (const [key, value] of Object.entries(sp)) {
        if (value !== undefined) {
            filters[key as keyof PropertyFilters] = Array.isArray(value) ? value[0] : value;
        }
    }

    const page = await listProperties(host, filters);

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="mb-8 flex justify-center">
                <SearchBar defaultPurpose={(filters.purpose as string) ?? "venda"} />
            </div>

            <div className="mb-8">
                <SearchFilterPanel currentFilters={filters} />
            </div>

            <SearchResultList page={page} />
        </div>
    );
}
