"use client";

import { Button } from "@/components/ui/button";

interface AdminErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
    return (
        <div className="container mx-auto py-8">
            <div className="rounded-md border border-red-200 bg-red-50 p-6 text-red-700">
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
