import { Bot, Calculator, Sparkles, TrendingUp } from "lucide-react";
import Image from "next/image";

import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
    { icon: Calculator, title: "Avaliação por comparáveis", text: "Valor de mercado a partir de imóveis reais da região." },
    { icon: Sparkles, title: "Novos anúncios e oportunidades", text: "O que entrou no mercado e o que está abaixo do preço." },
    { icon: Bot, title: "Busca em linguagem natural", text: "Descreva o imóvel e a IA monta os filtros." },
];

// Illustrative sample values for the decorative product preview (not real data).
const previewBars = [38, 52, 44, 61, 57, 72, 66, 84, 78, 92];

/** Decorative preview of the product on the brand panel; hidden from assistive tech. */
function ProductPreview() {
    return (
        <div aria-hidden className="relative mx-auto h-[19rem] w-full max-w-[34rem] select-none">
            <div className="absolute top-0 left-0 w-[62%] rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                    <p className="text-[0.8125rem] font-semibold text-white/60">Novos anúncios</p>
                    <span className="rounded-md bg-[#41b798]/15 px-2 py-0.5 text-xs font-semibold text-[#34cca3]">+18%</span>
                </div>
                <p className="mt-2 text-[1.75rem] leading-8 font-semibold text-white tabular-nums">651</p>
                <div className="mt-4 flex h-16 items-end gap-1.5">
                    {previewBars.map((height, index) => (
                        <span
                            className="flex-1 rounded-[4px] bg-[#41b798]"
                            key={index}
                            style={{ height: `${height}%`, opacity: 0.35 + index * 0.065 }}
                        />
                    ))}
                </div>
            </div>

            <div className="absolute top-24 right-0 w-[58%] rounded-2xl border border-white/10 bg-[#151922]/90 p-5 shadow-2xl shadow-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-lg bg-[#41b798]/15 text-[#34cca3]">
                        <TrendingUp className="size-4" />
                    </span>
                    <p className="text-[0.8125rem] font-semibold text-white/60">Valor estimado</p>
                </div>
                <p className="mt-3 text-2xl leading-8 font-semibold text-white tabular-nums">R$ 840.000</p>
                <div className="relative mt-4 h-2 rounded-full bg-gradient-to-r from-[#1796b3] to-[#41b798]">
                    <span className="absolute top-1/2 left-[38%] size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#151922] bg-white" />
                </div>
                <div className="mt-2 flex justify-between text-[0.6875rem] text-white/45">
                    <span>Mínimo</span>
                    <span>Máximo</span>
                </div>
            </div>

            <div className="absolute bottom-0 left-[8%] flex max-w-[78%] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 shadow-2xl shadow-black/40 backdrop-blur-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#41b798] text-[#151922]">
                    <Bot className="size-4" />
                </span>
                <p className="truncate text-sm text-white/80">“Apartamento de 3 quartos no Centro”</p>
            </div>
        </div>
    );
}

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
            <div className="relative flex h-28 shrink-0 items-center overflow-hidden bg-[#151922] px-6 lg:hidden">
                <div aria-hidden className="absolute -top-20 -left-16 size-56 rounded-full bg-[#41b798]/25 blur-[80px]" />
                <Image alt="Logo do sistema" className="relative size-12" height={512} priority src="/logo.png" width={512} />
            </div>

            {/* Brand panel: always dark, in both themes */}
            <div className="relative hidden overflow-hidden bg-[#151922] text-white lg:flex lg:flex-col">
                <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-40 -left-40 size-[34rem] rounded-full bg-[#41b798]/20 blur-[140px]" />
                    <div className="absolute -right-32 -bottom-48 size-[30rem] rounded-full bg-[#1796b3]/15 blur-[140px]" />
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
                </div>

                <div className="relative flex flex-1 flex-col justify-between gap-10 p-12 xl:p-16">
                    <Image alt="Logo do sistema" className="size-14" height={512} priority src="/logo.png" width={512} />

                    <div className="grid items-center gap-12 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="max-w-[32rem]">
                            <h2 className="text-4xl leading-[1.15] font-semibold tracking-tight text-balance xl:text-[2.75rem]">
                                O mercado imobiliário da sua região, medido{" "}
                                <span className="text-[#34cca3]">imóvel por imóvel.</span>
                            </h2>
                            <p className="mt-5 text-base leading-relaxed text-white/65">
                                Captação, avaliação e busca por IA em um só painel.
                            </p>
                        </div>
                        <ProductPreview />
                    </div>

                    <ul className="grid gap-6 xl:grid-cols-3">
                        {highlights.map((item) => (
                            <li className="flex gap-3" key={item.title}>
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#34cca3]">
                                    <item.icon className="size-5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white">{item.title}</p>
                                    <p className="mt-1 text-[0.8125rem] leading-5 text-white/55">{item.text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
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
