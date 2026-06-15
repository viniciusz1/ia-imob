import Link from "next/link";
import { Bath, BedDouble, Car, MapPin, MoveRight, Ruler } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { PropertyCard } from "./PropertyCard";
import { formatArea, locationLabel, priceLabel } from "@/services/public/format";
import type { LinkablePublicPropertySummary, SiteBranding } from "@/services/public/types";

export interface HomeTemplateProps {
    branding: SiteBranding | null;
    featured: LinkablePublicPropertySummary[];
    heroTitle: string;
    heroSubtitle: string;
}

export function ClassicHomeTemplate({ featured, heroTitle, heroSubtitle }: HomeTemplateProps) {
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
                <FeaturedPropertyGrid featured={featured} />
            </section>
        </>
    );
}

export function ShowcaseHomeTemplate({ branding, featured, heroTitle, heroSubtitle }: HomeTemplateProps) {
    const name = branding?.name ?? "Imobiliária";
    const lead = featured[0] ?? null;

    return (
        <>
            <section className="relative overflow-hidden bg-[var(--brand-text)] text-white">
                {lead?.cover_image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={lead.cover_image}
                        alt=""
                        aria-hidden
                        className="absolute inset-0 h-full w-full object-cover opacity-35"
                    />
                )}
                <div className="absolute inset-0 bg-[var(--brand-text)]/80" />

                <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:py-24">
                    <div className="max-w-3xl">
                        <p className="mb-4 text-sm font-semibold uppercase text-[var(--brand-accent)]">{name}</p>
                        <h1 className="text-4xl font-bold sm:text-6xl">{heroTitle}</h1>
                        <p className="mt-5 max-w-2xl text-lg text-white/80">{heroSubtitle}</p>
                        <div className="mt-8">
                            <SearchBar />
                        </div>
                    </div>

                    {lead && <SpotlightProperty property={lead} />}
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16">
                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase text-[var(--brand-primary)]">Curadoria</p>
                        <h2 className="mt-2 text-2xl font-bold text-[var(--brand-text)]">Seleção em destaque</h2>
                    </div>
                    <Link
                        href="/imoveis"
                        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-[var(--brand-primary)] hover:opacity-80"
                    >
                        Ver todos
                        <MoveRight className="size-4" aria-hidden />
                    </Link>
                </div>

                <FeaturedPropertyGrid featured={featured} />
            </section>
        </>
    );
}

function FeaturedPropertyGrid({ featured }: { featured: LinkablePublicPropertySummary[] }) {
    if (featured.length === 0) {
        return <p className="text-[var(--brand-muted)]">Nenhum imóvel disponível no momento.</p>;
    }

    return (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property) => (
                <PropertyCard key={property.slug} property={property} />
            ))}
        </div>
    );
}

function SpotlightProperty({ property }: { property: LinkablePublicPropertySummary }) {
    const area = formatArea(property.characteristics.usable_area);

    return (
        <Link
            href={`/imovel/${property.slug}`}
            className="group overflow-hidden rounded-lg border border-white/15 bg-white/10 shadow-2xl backdrop-blur transition hover:border-white/35"
        >
            <div className="relative aspect-[4/3] bg-white/10">
                {property.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={property.cover_image}
                        alt={property.title}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
                        Sem foto
                    </div>
                )}
                <span className="absolute left-4 top-4 rounded-full bg-[var(--brand-accent)] px-3 py-1 text-xs font-semibold text-[var(--brand-text)]">
                    Destaque principal
                </span>
            </div>

            <div className="space-y-3 p-5">
                <div className="flex items-center gap-2 text-sm text-white/75">
                    <MapPin className="size-4" aria-hidden />
                    {locationLabel(property.location) || "Localização sob consulta"}
                </div>
                <h3 className="line-clamp-2 text-xl font-semibold">{property.title}</h3>
                <p className="text-2xl font-bold text-[var(--brand-accent)]">{priceLabel(property.pricing)}</p>

                <ul className="flex flex-wrap gap-4 text-sm text-white/75">
                    <li className="flex items-center gap-1">
                        <BedDouble className="size-4" aria-hidden /> {property.characteristics.bedrooms}
                    </li>
                    <li className="flex items-center gap-1">
                        <Bath className="size-4" aria-hidden /> {property.characteristics.bathrooms}
                    </li>
                    <li className="flex items-center gap-1">
                        <Car className="size-4" aria-hidden /> {property.characteristics.garage_spaces}
                    </li>
                    {area && (
                        <li className="flex items-center gap-1">
                            <Ruler className="size-4" aria-hidden /> {area}
                        </li>
                    )}
                </ul>
            </div>
        </Link>
    );
}
