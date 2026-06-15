"use client";

import Link from "next/link";
import { ArrowLeft, Database, FileWarning } from "lucide-react";

import { useAgencyExtractorRefinement } from "@/hooks/useAgencyExtractorRefinement";
import type { AgencyType } from "@/types/agencyConfig";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ExtractorRefinementClientProps {
    agencyType: AgencyType;
    agencyId: number;
}

export function ExtractorRefinementClient({ agencyType, agencyId }: ExtractorRefinementClientProps) {
    const { data, isLoading, error } = useAgencyExtractorRefinement(agencyType, agencyId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <BackLink />
                <Card>
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Carregando Bancada de Refinamento de Extractors...
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-4">
                <BackLink />
                <Card>
                    <CardContent className="py-8 text-sm text-red-600">
                        Erro ao carregar a Bancada de Refinamento de Extractors.
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <BackLink />

            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Database className="h-6 w-6" />
                        <h1 className="text-3xl font-bold tracking-tight">Verificar extratores</h1>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{data.agency.name}</span>
                        <Badge variant="outline">{data.agency.agency_type}</Badge>
                        <span>{data.agency.domain ?? "sem domínio"}</span>
                    </div>
                </div>
                <Badge variant={data.agency.is_active ? "default" : "secondary"}>
                    {data.agency.is_active ? "Ativa" : "Inativa"}
                </Badge>
            </div>

            {!data.evidence_available && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <FileWarning className="h-5 w-5 text-yellow-600" />
                            <CardTitle>Sem Evidencia HTML</CardTitle>
                        </div>
                        <CardDescription>
                            Esta agência ainda não possui Evidencia HTML persistida para a Bancada.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        Rode o Cadastrador ou reonboard para capturar a Amostra de Torneio antes de verificar os Extractors.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function BackLink() {
    return (
        <Button variant="ghost" asChild className="pl-0">
            <Link href="/agencias-importadas">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para Agências importadas
            </Link>
        </Button>
    );
}
