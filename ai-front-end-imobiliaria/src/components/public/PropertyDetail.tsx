import { BedDouble, Bath, Car, Ruler, Building2, Calendar, MapPin, Check } from "lucide-react";
import type { PublicPropertyDetail } from "@/services/public/types";
import { formatArea, priceLabel, purposeLabel } from "@/services/public/format";

export function PropertyDetail({ property }: { property: PublicPropertyDetail }) {
    const c = property.characteristics;
    const loc = property.location;

    return (
        <article className="mx-auto max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <span className="inline-block rounded-full bg-[var(--brand-primary)] px-3 py-1 text-xs font-semibold text-white">
                    {purposeLabel(property.purpose)}
                </span>
                <h1 className="mt-3 text-2xl font-bold text-[var(--brand-text)] sm:text-3xl">
                    {property.title}
                </h1>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                    {[loc.neighborhood, loc.city].filter(Boolean).join(", ")}
                    {" · "}
                    Ref: {property.reference_code}
                </p>
                <p className="mt-4 text-2xl font-bold text-[var(--brand-primary)]">
                    {priceLabel(property.pricing)}
                </p>
            </div>

            {/* Gallery */}
            {property.media.images.length > 0 && (
                <div className="mb-10">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {property.media.images.slice(0, 4).map((img, idx) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                key={idx}
                                src={img.url}
                                alt={img.description ?? property.title}
                                loading="lazy"
                                className={`h-64 w-full rounded-lg object-cover ${
                                    idx === 0 ? "sm:col-span-2 sm:h-96" : ""
                                }`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Characteristics grid */}
            <section className="mb-10 grid grid-cols-2 gap-4 rounded-xl bg-[var(--brand-surface)] p-6 sm:grid-cols-3 lg:grid-cols-4">
                <CharItem icon={BedDouble} label="Quartos" value={String(c.bedrooms)} />
                <CharItem icon={Bath} label="Banheiros" value={String(c.bathrooms)} />
                <CharItem icon={Car} label="Vagas" value={String(c.garage_spaces)} />
                <CharItem icon={Ruler} label="Área útil" value={formatArea(c.usable_area) ?? "-"} />
                {c.total_area && <CharItem icon={Ruler} label="Área total" value={formatArea(c.total_area) ?? "-"} />}
                {c.suites > 0 && <CharItem icon={BedDouble} label="Suítes" value={String(c.suites)} />}
                {c.floor_number && <CharItem icon={Building2} label="Andar" value={String(c.floor_number)} />}
                {c.build_year && <CharItem icon={Calendar} label="Ano" value={String(c.build_year)} />}
            </section>

            {/* Description */}
            {property.description && (
                <section className="mb-10">
                    <h2 className="mb-3 text-lg font-semibold text-[var(--brand-text)]">Descrição</h2>
                    <p className="leading-relaxed text-[var(--brand-muted)]">{property.description}</p>
                </section>
            )}

            {/* Features */}
            {property.features.length > 0 && (
                <section className="mb-10">
                    <h2 className="mb-3 text-lg font-semibold text-[var(--brand-text)]">Comodidades</h2>
                    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {property.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-[var(--brand-muted)]">
                                <Check className="size-4 text-[var(--brand-primary)]" aria-hidden />
                                {feature}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Location */}
            <section className="mb-10">
                <h2 className="mb-3 text-lg font-semibold text-[var(--brand-text)]">Localização</h2>
                <div className="flex items-start gap-2 rounded-xl bg-[var(--brand-surface)] p-4">
                    <MapPin className="mt-0.5 size-5 text-[var(--brand-primary)]" aria-hidden />
                    <div>
                        <p className="text-[var(--brand-text)]">
                            {[loc.neighborhood, loc.city].filter(Boolean).join(", ")}
                        </p>
                        {!loc.show_exact_address && (
                            <p className="mt-1 text-xs text-[var(--brand-muted)]">
                                Endereço exato omitido — localização aproximada.
                            </p>
                        )}
                    </div>
                </div>
            </section>

            {/* Broker */}
            {property.broker && (
                <section className="rounded-xl border border-[var(--brand-muted)]/20 bg-[var(--brand-surface)] p-6">
                    <h2 className="mb-4 text-lg font-semibold text-[var(--brand-text)]">Corretor</h2>
                    <div className="flex items-start gap-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-[var(--brand-primary)]/10 text-lg font-bold text-[var(--brand-primary)]">
                            {property.broker.name.charAt(0)}
                        </div>
                        <div>
                            <p className="font-semibold text-[var(--brand-text)]">{property.broker.name}</p>
                            {property.broker.creci && (
                                <p className="text-sm text-[var(--brand-muted)]">CRECI: {property.broker.creci}</p>
                            )}
                            {property.broker.description && (
                                <p className="mt-2 text-sm text-[var(--brand-muted)]">{property.broker.description}</p>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </article>
    );
}

function CharItem({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <Icon className="size-5 text-[var(--brand-primary)]" aria-hidden />
            <div>
                <p className="text-lg font-bold text-[var(--brand-text)]">{value}</p>
                <p className="text-xs text-[var(--brand-muted)]">{label}</p>
            </div>
        </div>
    );
}
