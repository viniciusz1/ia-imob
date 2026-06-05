import Link from "next/link";
import { Facebook, Instagram } from "lucide-react";
import type { SiteBranding } from "@/services/public/types";

export function SiteHeader({ branding }: { branding: SiteBranding | null }) {
    const name = branding?.name ?? "Imobiliária";

    return (
        <header className="sticky top-0 z-30 border-b border-[var(--brand-muted)]/15 bg-[var(--brand-bg)]/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
                <Link href="/" className="flex items-center gap-2">
                    {branding?.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={branding.logo} alt={name} className="h-9 w-auto" />
                    ) : (
                        <span className="text-xl font-bold text-[var(--brand-primary)]">{name}</span>
                    )}
                </Link>

                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link href="/imoveis?purpose=venda" className="hover:text-[var(--brand-primary)]">
                        Comprar
                    </Link>
                    <Link href="/imoveis?purpose=locacao" className="hover:text-[var(--brand-primary)]">
                        Alugar
                    </Link>
                    <Link href="/contato" className="hover:text-[var(--brand-primary)]">
                        Contato
                    </Link>
                </nav>
            </div>
        </header>
    );
}

export function SiteFooter({ branding }: { branding: SiteBranding | null }) {
    const name = branding?.name ?? "Imobiliária";
    const { facebook, instagram } = branding?.contact ?? { facebook: null, instagram: null };

    return (
        <footer className="mt-16 border-t border-[var(--brand-muted)]/15 bg-[var(--brand-surface)]">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-lg font-semibold text-[var(--brand-primary)]">{name}</p>
                    {branding?.content.about_text && (
                        <p className="mt-1 max-w-md text-sm text-[var(--brand-muted)]">{branding.content.about_text}</p>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {facebook && (
                        <a href={facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
                            <Facebook className="size-5 text-[var(--brand-muted)] hover:text-[var(--brand-primary)]" />
                        </a>
                    )}
                    {instagram && (
                        <a href={instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
                            <Instagram className="size-5 text-[var(--brand-muted)] hover:text-[var(--brand-primary)]" />
                        </a>
                    )}
                </div>
            </div>
            <p className="pb-6 text-center text-xs text-[var(--brand-muted)]">
                © {name}. Todos os direitos reservados.
            </p>
        </footer>
    );
}
