import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getBranding } from "@/services/public/publicApi";
import { brandStyle } from "@/components/public/brandStyle";
import { SiteFooter, SiteHeader } from "@/components/public/SiteChrome";

export async function generateMetadata({
    params,
}: {
    params: Promise<{ host: string }>;
}): Promise<Metadata> {
    const { host } = await params;
    const branding = await getBranding(host);
    const name = branding?.name ?? "Imobiliária";

    return {
        title: {
            default: name,
            template: `%s | ${name}`,
        },
        description: branding?.content.about_text ?? `Imóveis à venda e para alugar com a ${name}.`,
        icons: branding?.favicon ? { icon: branding.favicon } : undefined,
    };
}

export default async function SiteLayout({
    children,
    params,
}: {
    children: ReactNode;
    params: Promise<{ host: string }>;
}) {
    const { host } = await params;
    const branding = await getBranding(host);

    return (
        <div
            style={brandStyle(branding)}
            className="flex min-h-screen flex-col bg-[var(--brand-bg)] text-[var(--brand-text)]"
        >
            <SiteHeader branding={branding} />
            <main className="flex-1">{children}</main>
            <SiteFooter branding={branding} />
        </div>
    );
}
