import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { getProperty } from "@/services/public/publicApi";
import { PropertyDetail } from "@/components/public/PropertyDetail";
import { ContactForm } from "@/components/public/ContactForm";
import { priceLabel } from "@/services/public/format";

interface Props {
    params: Promise<{ host: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { host, slug } = await params;
    const property = await getProperty(host, slug);

    if (!property) {
        return { title: "Imóvel não encontrado" };
    }

    const title = `${property.title} — ${property.reference_code}`;
    const description = property.description ?? `${property.title} em ${property.location.neighborhood ?? ""}, ${property.location.city ?? ""}. ${property.characteristics.bedrooms} quartos, ${property.characteristics.bathrooms} banheiros.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            type: "website",
            images: property.cover_image ? [{ url: property.cover_image }] : [],
            locale: "pt_BR",
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: property.cover_image ? [property.cover_image] : [],
        },
        alternates: {
            canonical: `/imovel/${property.slug}`,
        },
    };
}

export default async function PropertyPage({ params }: Props) {
    const { host, slug } = await params;
    const property = await getProperty(host, slug);

    if (!property) {
        notFound();
    }

    const whatsappPhone = property.broker?.phone?.replace(/\D/g, "");

    return (
        <div className="mx-auto max-w-6xl px-4 py-8">
            <PropertyDetail property={property} />

            {/* Contact section */}
            <section className="mt-12 border-t border-[var(--brand-muted)]/15 pt-10">
                <div className="grid gap-10 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <h2 className="mb-6 text-xl font-bold text-[var(--brand-text)]">
                            Tenho interesse neste imóvel
                        </h2>
                        <ContactForm host={host} propertyId={property.reference_code} />
                    </div>

                    <aside className="space-y-4">
                        {whatsappPhone && (
                            <a
                                href={`https://wa.me/55${whatsappPhone}?text=${encodeURIComponent(`Olá! Tenho interesse no imóvel ${property.reference_code} — ${property.title}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-semibold text-white transition hover:bg-green-600"
                            >
                                <MessageCircle className="size-5" aria-hidden />
                                Falar no WhatsApp
                            </a>
                        )}

                        <div className="rounded-xl bg-[var(--brand-surface)] p-4 text-sm text-[var(--brand-muted)]">
                            <p className="font-medium text-[var(--brand-text)]">Prefere uma ligação?</p>
                            {property.broker?.phone ? (
                                <p className="mt-1">{property.broker.phone}</p>
                            ) : (
                                <p className="mt-1">Entre em contato pelo formulário e retornaremos.</p>
                            )}
                        </div>
                    </aside>
                </div>
            </section>
        </div>
    );
}
