"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { clearAuthenticatedSession } from "@/services/authSessionCookie";

interface AdminErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function AdminError({ error, reset }: AdminErrorProps) {
    const isUnauthorized =
        error.message?.includes("401") ||
        error.message?.includes("Unauthenticated");

    useEffect(() => {
        if (isUnauthorized) {
            clearAuthenticatedSession();
        }
    }, [isUnauthorized]);

    if (isUnauthorized) {
        return (
            <div className="mx-auto max-w-2xl">
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
                    <h2 className="text-lg font-semibold mb-2">Sessão expirada</h2>
                    <p className="text-sm mb-4">
                        Sua sessão expirou ou você não está autenticado. Por favor, faça login novamente para continuar.
                    </p>
                    <Button
                        onClick={() => {
                            clearAuthenticatedSession();
                            window.location.href = "/login";
                        }}
                    >
                        Fazer login
                    </Button>
                </div>
            </div>
        );
    }

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
