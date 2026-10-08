"use client";

import { useEffect } from "react";
import { CircleAlert, RotateCcw } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="space-y-6">
            <PageHeader
                description="Gerencie quem acessa o sistema e o que cada pessoa pode fazer."
                title="Usuários"
            />

            <EmptyState
                action={(
                    <Button onClick={() => reset()}>
                        <RotateCcw />
                        Tentar novamente
                    </Button>
                )}
                description={(
                    <>
                        <p>
                            Não foi possível carregar os dados dos usuários. Verifique se a API está online e tente novamente.
                        </p>
                        {error.message && (
                            <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs break-all">
                                {error.message}
                            </p>
                        )}
                    </>
                )}
                icon={CircleAlert}
                title="Erro de conexão"
            />
        </div>
    );
}
