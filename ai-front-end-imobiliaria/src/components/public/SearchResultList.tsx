import { PropertyCard } from "./PropertyCard";
import { hasPropertySlug, type Paginated, type PublicPropertySummary } from "@/services/public/types";

interface Props {
    page: Paginated<PublicPropertySummary>;
}

export function SearchResultList({ page }: Props) {
    const { meta } = page;
    const properties = page.data.filter(hasPropertySlug);

    if (!properties.length) {
        return (
            <p className="py-12 text-center text-[var(--brand-muted)]">
                Nenhum imóvel encontrado
            </p>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                    <PropertyCard key={property.slug} property={property} />
                ))}
            </div>

            {meta && meta.last_page > 1 && (
                <p className="mt-8 text-center text-sm text-[var(--brand-muted)]">
                    Página {meta.current_page} de {meta.last_page}
                </p>
            )}
        </div>
    );
}
