"use client";

import { Button } from "@/components/ui/button";

interface AdminErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
    return (
        <div className="mx-auto max-w-2xl">
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
                <h2 className="text-lg font-semibold mb-2">Erro ao carregar a página</h2>
                <p className="text-sm mb-4">
                    {error.message || "Ocorreu um erro inesperado. Tente novamente."}
                </p>
                <Button onClick={reset} variant="outline">
                    Tentar novamente
                </Button>
            </div>
        </div>
    );
}
