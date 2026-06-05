import Link from "next/link";
import { Bath, BedDouble, Car, Ruler } from "lucide-react";
import type { LinkablePublicPropertySummary } from "@/services/public/types";
import { formatArea, locationLabel, priceLabel, purposeLabel } from "@/services/public/format";

export function PropertyCard({ property }: { property: LinkablePublicPropertySummary }) {
    const c = property.characteristics;
    const area = formatArea(c.usable_area);

    return (
        <Link
            href={`/imovel/${property.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-[var(--brand-muted)]/20 bg-[var(--brand-surface)] shadow-sm transition hover:shadow-md"
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-[var(--brand-muted)]/10">
                {property.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={property.cover_image}
                        alt={property.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-[var(--brand-muted)]">
                        Sem foto
                    </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-[var(--brand-primary)] px-3 py-1 text-xs font-semibold text-white">
                    {purposeLabel(property.purpose)}
                </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--brand-muted)]">
                    {locationLabel(property.location)}
                </p>
                <h3 className="line-clamp-2 font-semibold text-[var(--brand-text)]">{property.title}</h3>
                <p className="text-lg font-bold text-[var(--brand-primary)]">{priceLabel(property.pricing)}</p>

                <ul className="mt-auto flex flex-wrap gap-4 pt-2 text-sm text-[var(--brand-muted)]">
                    <li className="flex items-center gap-1">
                        <BedDouble className="size-4" aria-hidden /> {c.bedrooms}
                    </li>
                    <li className="flex items-center gap-1">
                        <Bath className="size-4" aria-hidden /> {c.bathrooms}
                    </li>
                    <li className="flex items-center gap-1">
                        <Car className="size-4" aria-hidden /> {c.garage_spaces}
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
