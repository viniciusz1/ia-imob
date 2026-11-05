import Image from "next/image";

import { ThemeToggle } from "@/components/theme-toggle";

// Brand panel colors: the app's darkest navy, so the logo is the only green
// on the panel, and the light silver used for text on dark surfaces.
const PANEL_NAVY = "#151922";
const PANEL_TEXT = "#eef1f5";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // The brand panel takes ~70% of the width; the form column never goes
        // below 400px, so on smaller screens it takes a bit more than 30%.
        <div className="flex min-h-svh flex-col bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(400px,30%)]">
            {/* Mobile: a compact brand strip, where the panel doesn't fit */}
            <div className="flex h-24 shrink-0 items-center px-6 lg:hidden" style={{ backgroundColor: PANEL_NAVY }}>
                <Image alt="Logo do sistema" className="size-11" height={512} priority src="/logo.png" width={512} />
            </div>

            {/* Brand panel: flat navy, the oversized logo cropped at the corner as
                the only graphic, and one sentence. Same in both themes. */}
            <div className="relative hidden overflow-hidden lg:block" style={{ backgroundColor: PANEL_NAVY, color: PANEL_TEXT }}>
                <Image
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute -right-[12%] -bottom-[18%] h-[70%] w-auto max-w-none select-none"
                    height={891}
                    priority
                    sizes="60vw"
                    src="/logo-large.webp"
                    width={896}
                />

                <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
                    <div className="max-w-[34rem]">
                        <h2 className="text-[2.75rem] leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
                            O mercado imobiliário da sua região, medido imóvel por imóvel.
                        </h2>
                        <p className="mt-6 max-w-[26rem] text-base leading-relaxed opacity-70">
                            Captação, avaliação e busca por IA em um só painel.
                        </p>
                    </div>

                    <p className="text-sm font-medium tracking-wide opacity-60">
                        Captação · Avaliação · Novos imóveis · Leilões
                    </p>
                </div>
            </div>

            {/* Right column: sign-in. overflow-hidden keeps the brand glow from
                widening the page horizontally */}
            <div className="relative flex flex-1 flex-col overflow-hidden px-6 py-8 sm:px-10 lg:px-10 xl:px-12">
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-[110px]"
                />

                <main className="relative z-10 flex flex-1 items-center justify-center py-10">
                    <div className="w-full max-w-[400px]">{children}</div>
                </main>

                <footer className="relative z-10 flex items-center justify-between gap-4">
                    <p className="font-mono text-xs text-muted-foreground">
                        © {new Date().getFullYear()} · Sistema Imobiliário
                    </p>
                    <ThemeToggle />
                </footer>
            </div>
        </div>
    );
}
