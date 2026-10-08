"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
    updateMarketSearchAllowance,
    type AgencySummary,
} from "@/services/adminApi";

interface AgencySearchAllowanceCardProps {
    agency: AgencySummary;
}

function formatResetDate(value: string): string {
    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
    }).format(new Date(value));
}

export function AgencySearchAllowanceCard({ agency }: AgencySearchAllowanceCardProps) {
    const router = useRouter();
    const usage = agency.market_search_usage;
    const [limit, setLimit] = useState(String(agency.market_search_weekly_limit));
    const [isSaving, setIsSaving] = useState(false);
    const parsedLimit = Number(limit);
    const isValid = Number.isInteger(parsedLimit) && parsedLimit >= 0 && parsedLimit <= 1_000_000;
    const progress = usage && usage.limit > 0
        ? Math.min((usage.used / usage.limit) * 100, 100)
        : usage?.used ? 100 : 0;

    async function handleSave(): Promise<void> {
        if (!isValid) return;

        setIsSaving(true);
        try {
            await updateMarketSearchAllowance(agency.id, parsedLimit);
            toast.success("Limite semanal atualizado.");
            router.refresh();
        } catch {
            toast.error("Não foi possível atualizar o limite semanal.");
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader
                actions={agency.market_search_weekly_limit === 0 && <Badge variant="muted">Desativado</Badge>}
                description="Limite compartilhado entre todos os usuários da agência."
                icon={Search}
                title="Uso do IA Searcher"
            />

            {usage && (
                <div className="space-y-3 border-b px-4 py-4 sm:px-5">
                    <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Utilizadas</p>
                            <p className="text-2xl leading-none text-foreground tabular-nums">{usage.used}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Restantes</p>
                            <p className="text-2xl leading-none text-foreground tabular-nums">{usage.remaining}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">Limite</p>
                            <p className="text-2xl leading-none text-foreground tabular-nums">{usage.limit}</p>
                        </div>
                    </div>
                    <Progress aria-label="Consumo semanal de buscas" className="h-1.5" value={progress} />
                    <p className="text-xs text-muted-foreground">
                        Renova em {formatResetDate(usage.resets_at)}.
                    </p>
                </div>
            )}

            <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
                <FormField
                    className="flex-1"
                    hint={
                        <span id="market-search-weekly-limit-help">
                            Cada página entregue conta como uma busca. Use 0 para desativar.
                        </span>
                    }
                    htmlFor="market-search-weekly-limit"
                    label="Limite semanal"
                >
                    <Input
                        id="market-search-weekly-limit"
                        type="number"
                        min={0}
                        max={1_000_000}
                        step={1}
                        value={limit}
                        onChange={(event) => setLimit(event.target.value)}
                        aria-describedby="market-search-weekly-limit-help"
                    />
                </FormField>
                <Button
                    className="mt-5"
                    type="button"
                    onClick={handleSave}
                    disabled={!isValid || isSaving || parsedLimit === agency.market_search_weekly_limit}
                >
                    {isSaving && <Loader2 className="animate-spin" />}
                    {isSaving ? "Salvando..." : "Salvar"}
                </Button>
            </div>
        </Card>
    );
}
