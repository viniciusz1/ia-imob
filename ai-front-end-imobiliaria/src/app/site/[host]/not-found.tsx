import Link from "next/link";
import { headers } from "next/headers";
import { getBranding } from "@/services/public/publicApi";
import { brandStyle } from "@/components/public/brandStyle";
import { SiteFooter, SiteHeader } from "@/components/public/SiteChrome";
import { Home } from "lucide-react";

export default async function PublicNotFound() {
    const headersList = await headers();
    const host = (headersList.get("host") ?? "localhost").split(":")[0];

    let branding = null;
    try {
        branding = await getBranding(host);
    } catch {
        // Branding fetch may fail; render with fallback palette
    }

    return (
        <div
            style={brandStyle(branding)}
            className="flex min-h-screen flex-col bg-[var(--brand-bg)] text-[var(--brand-text)]"
        >
            <SiteHeader branding={branding} />
            <main className="flex flex-1 items-center justify-center">
                <div className="text-center">
                    <h1 className="text-6xl font-bold text-[var(--brand-primary)]">404</h1>
                    <p className="mt-4 text-lg text-[var(--brand-muted)]">
                        Imóvel não encontrado ou página inexistente.
                    </p>
                    <Link
                        href="/"
                        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-6 py-3 font-semibold text-white transition hover:opacity-90"
                    >
                        <Home className="size-4" aria-hidden />
                        Voltar ao início
                    </Link>
                </div>
            </main>
            <SiteFooter branding={branding} />
        </div>
    );
}
