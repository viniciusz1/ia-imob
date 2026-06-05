"use client";

import { useEffect } from "react";
import { Home, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function PublicError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Public site error:", error);
    }, [error]);

    return (
        <main className="flex min-h-screen items-center justify-center bg-[var(--brand-bg)] text-[var(--brand-text)]">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-[var(--brand-primary)]">
                    Algo deu errado
                </h1>
                <p className="mt-4 text-lg text-[var(--brand-muted)]">
                    Não foi possível carregar esta página. Tente novamente.
                </p>
                <div className="mt-6 flex justify-center gap-4">
                    <button
                        onClick={reset}
                        className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-6 py-3 font-semibold text-white transition hover:opacity-90"
                    >
                        <RefreshCw className="size-4" aria-hidden />
                        Tentar novamente
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-lg border border-[var(--brand-muted)]/20 px-6 py-3 font-semibold text-[var(--brand-text)] transition hover:bg-[var(--brand-surface)]"
                    >
                        <Home className="size-4" aria-hidden />
                        Início
                    </Link>
                </div>
            </div>
        </main>
    );
}
