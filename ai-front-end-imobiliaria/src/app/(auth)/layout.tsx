import Image from "next/image";

import { ThemeToggle } from "@/components/theme-toggle";

// public/login-property.jpg — foto de imóvel sob a licença do Unsplash
// (https://unsplash.com/photos/1568605114967-8130f3a36994). Para trocar a
// imagem, basta substituir o arquivo mantendo o mesmo nome.

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        // A foto ocupa ~70% da largura; a coluna do formulário nunca desce de
        // 400px, então em telas menores ela toma um pouco mais que 30%.
        <div className="flex min-h-svh flex-col bg-background text-foreground lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(400px,30%)]">
            {/* Faixa do imóvel no mobile, onde a coluna da foto não cabe */}
            <div className="relative h-36 shrink-0 overflow-hidden lg:hidden">
                <Image
                    src="/login-property.jpg"
                    alt="Casa contemporânea iluminada ao anoitecer"
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover"
                />
                <div
                    aria-hidden
                    className="absolute inset-0 bg-primary/25 mix-blend-multiply dark:bg-primary/20 dark:mix-blend-soft-light"
                />
                <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent"
                />
            </div>

            {/* Coluna esquerda: imóvel em destaque */}
            <div className="relative hidden overflow-hidden lg:block">
                <Image
                    src="/login-property.jpg"
                    alt="Casa contemporânea iluminada ao anoitecer"
                    fill
                    priority
                    sizes="(min-width: 1024px) 70vw, 0px"
                    className="object-cover"
                />

                {/* Tinta da marca sobre a foto, para o imóvel pertencer à paleta do sistema */}
                <div
                    aria-hidden
                    className="absolute inset-0 bg-primary/25 mix-blend-multiply dark:bg-primary/20 dark:mix-blend-soft-light"
                />

                {/* Base escura fixa nos dois temas: a legenda fica sempre legível */}
                <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                />

                <div className="absolute inset-x-0 bottom-0 p-12">
                    <p className="max-w-[26rem] text-3xl leading-tight font-semibold tracking-tight text-balance text-white">
                        O mercado imobiliário da sua região, medido imóvel por
                        imóvel.
                    </p>
                    <p className="mt-4 max-w-[26rem] text-sm text-white/75">
                        Captação, avaliação e busca por IA em um só painel.
                    </p>
                </div>
            </div>

            {/* Coluna direita: acesso ao sistema. overflow-hidden contém o
                brilho da marca, que senão estoura a página na horizontal */}
            <div className="relative flex flex-1 flex-col overflow-hidden px-6 py-8 sm:px-10 lg:px-10 xl:px-12">
                {/* Brilho suave da marca, sutil o bastante para não competir com o formulário */}
                <div
                    aria-hidden
                    className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-[110px]"
                />

                <main className="relative z-10 flex flex-1 items-center justify-center py-10">
                    <div className="w-full max-w-[400px]">{children}</div>
                </main>

                <footer className="relative z-10 flex items-center justify-between gap-4">
                    <p className="font-mono text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Prospectai · Sistema Imobiliário
                    </p>
                    <ThemeToggle />
                </footer>
            </div>
        </div>
    );
}
