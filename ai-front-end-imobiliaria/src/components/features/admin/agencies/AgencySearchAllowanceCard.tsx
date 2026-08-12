"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Uso do IA Searcher
                        </CardTitle>
                        <CardDescription>
                            Limite compartilhado entre todos os usuários da agência.
                        </CardDescription>
                    </div>
                    {agency.market_search_weekly_limit === 0 && (
                        <Badge variant="secondary">Desativado</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                {usage && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                                <p className="text-muted-foreground">Utilizadas</p>
                                <p className="text-lg font-semibold">{usage.used}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Restantes</p>
                                <p className="text-lg font-semibold">{usage.remaining}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Limite</p>
                                <p className="text-lg font-semibold">{usage.limit}</p>
                            </div>
                        </div>
                        <Progress aria-label="Consumo semanal de buscas" value={progress} />
                        <p className="text-xs text-muted-foreground">
                            Renova em {formatResetDate(usage.resets_at)}.
                        </p>
                    </div>
                )}

                <div className="flex items-end gap-3 border-t pt-4">
                    <div className="flex-1 space-y-2">
                        <Label htmlFor="market-search-weekly-limit">Limite semanal</Label>
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
                        <p id="market-search-weekly-limit-help" className="text-xs text-muted-foreground">
                            Cada página entregue conta como uma busca. Use 0 para desativar.
                        </p>
                    </div>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={!isValid || isSaving || parsedLimit === agency.market_search_weekly_limit}
                    >
                        {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
