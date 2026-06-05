import { getBranding, listProperties } from "@/services/public/publicApi";
import { PropertyCard } from "@/components/public/PropertyCard";
import { SearchBar } from "@/components/public/SearchBar";
import { hasPropertySlug } from "@/services/public/types";

export default async function HomePage({ params }: { params: Promise<{ host: string }> }) {
    const { host } = await params;

    const [branding, highlighted] = await Promise.all([
        getBranding(host),
        listProperties(host, { is_highlighted: 1, per_page: 6 }),
    ]);

    const highlightedProperties = highlighted.data.filter(hasPropertySlug);
    const featured = highlightedProperties.length
        ? highlightedProperties
        : (await listProperties(host, { per_page: 8 })).data.filter(hasPropertySlug);

    const heroTitle = branding?.content.hero_title ?? "Encontre o imóvel dos seus sonhos";
    const heroSubtitle =
        branding?.content.hero_subtitle ?? "Imóveis selecionados à venda e para alugar.";

    return (
        <>
            <section className="bg-[var(--brand-primary)]/5">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-20 text-center">
                    <h1 className="text-3xl font-bold text-[var(--brand-text)] sm:text-5xl">{heroTitle}</h1>
                    <p className="max-w-2xl text-lg text-[var(--brand-muted)]">{heroSubtitle}</p>
                    <SearchBar />
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16">
                <h2 className="mb-8 text-2xl font-bold text-[var(--brand-text)]">Imóveis em destaque</h2>

                {featured.length === 0 ? (
                    <p className="text-[var(--brand-muted)]">Nenhum imóvel disponível no momento.</p>
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {featured.map((property) => (
                            <PropertyCard key={property.slug} property={property} />
                        ))}
                    </div>
                )}
            </section>
        </>
    );
}
