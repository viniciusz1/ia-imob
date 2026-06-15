"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Database, FileCode2, FileWarning, ListChecks } from "lucide-react";

import { useAgencyExtractorRefinement } from "@/hooks/useAgencyExtractorRefinement";
import type { AgencyFieldExtractor, AgencyType } from "@/types/agencyConfig";
import type { AgencyEvidenceHtml } from "@/types/agencyRefinement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ExtractorRefinementClientProps {
    agencyType: AgencyType;
    agencyId: number;
}

interface FieldExtractorSummary {
    fieldName: string;
    extractors: AgencyFieldExtractor[];
}

export function ExtractorRefinementClient({ agencyType, agencyId }: ExtractorRefinementClientProps) {
    const { data, isLoading, error } = useAgencyExtractorRefinement(agencyType, agencyId);
    const [selectedFieldName, setSelectedFieldName] = useState<string | null>(null);
    const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null);
    const fieldSummaries = useMemo(
        () => buildFieldSummaries(data?.agency.extractors ?? []),
        [data?.agency.extractors]
    );
    const selectedField = selectedFieldName
        ? fieldSummaries.find((summary) => summary.fieldName === selectedFieldName) ?? fieldSummaries[0]
        : fieldSummaries[0];
    const selectedEvidence = selectedEvidenceId
        ? data?.evidence.find((evidence) => evidence.id === selectedEvidenceId) ?? data?.evidence[0]
        : data?.evidence[0];

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

            {data.evidence_available && (
                <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
                    <section className="rounded-md border bg-background">
                        <div className="flex items-center gap-2 border-b px-4 py-3">
                            <ListChecks className="h-4 w-4" />
                            <h2 className="text-base font-semibold">Campos do extrator</h2>
                        </div>
                        <div className="divide-y">
                            {fieldSummaries.map((summary) => (
                                <button
                                    key={summary.fieldName}
                                    type="button"
                                    aria-pressed={summary.fieldName === selectedField?.fieldName}
                                    onClick={() => setSelectedFieldName(summary.fieldName)}
                                    className={cn(
                                        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/70",
                                        summary.fieldName === selectedField?.fieldName && "bg-muted"
                                    )}
                                >
                                    <span className="min-w-0">
                                        <span className="block truncate font-medium">{summary.fieldName}</span>
                                        <span className="block truncate text-xs text-muted-foreground">
                                            {primaryExtractorLabel(summary.extractors)}
                                        </span>
                                    </span>
                                    <Badge variant="secondary">{formatExtractorCount(summary.extractors.length)}</Badge>
                                </button>
                            ))}
                            {fieldSummaries.length === 0 && (
                                <div className="px-4 py-6 text-sm text-muted-foreground">
                                    Nenhum extractor cadastrado para esta agência.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="space-y-4 rounded-md border bg-background p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h2 className="text-base font-semibold">
                                    {selectedField ? `Campo ${selectedField.fieldName}` : "Campo sem extractors"}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {selectedField
                                        ? formatExtractorCount(selectedField.extractors.length)
                                        : "Nenhum extractor cadastrado"}
                                </p>
                            </div>
                            <EvidenceSwitcher
                                evidence={data.evidence}
                                selectedEvidence={selectedEvidence}
                                onSelect={setSelectedEvidenceId}
                            />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(260px,420px)_minmax(0,1fr)]">
                            <div className="space-y-3">
                                {(selectedField?.extractors ?? []).map((extractor) => (
                                    <div key={extractor.id} className="rounded-md border p-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge>Prioridade {extractor.priority}</Badge>
                                            <Badge variant="outline">{extractor.source_type}</Badge>
                                            <Badge variant="secondary">{extractor.output_type}</Badge>
                                            {extractor.is_optional && <Badge variant="outline">Opcional</Badge>}
                                        </div>
                                        <code className="mt-3 block break-all rounded-md bg-muted px-2 py-1 text-xs">
                                            {extractor.selector_value}
                                        </code>
                                        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                                            <span>Indice: {extractor.selector_index ?? "primeiro"}</span>
                                            <span>Join: {extractor.selector_join ? "sim" : "não"}</span>
                                            <span className="sm:col-span-2">
                                                Pipeline: {extractor.pipeline ?? "sem pipeline"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <HtmlEvidencePanel evidence={selectedEvidence} />
                        </div>
                    </section>
                </div>
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

function EvidenceSwitcher({
    evidence,
    selectedEvidence,
    onSelect,
}: {
    evidence: AgencyEvidenceHtml[];
    selectedEvidence: AgencyEvidenceHtml | undefined;
    onSelect: (id: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {evidence.map((item) => (
                <Button
                    key={item.id}
                    type="button"
                    variant={item.id === selectedEvidence?.id ? "default" : "outline"}
                    size="sm"
                    aria-pressed={item.id === selectedEvidence?.id}
                    onClick={() => onSelect(item.id)}
                >
                    <FileCode2 className="h-4 w-4" />
                    HTML {item.sample_index + 1}
                </Button>
            ))}
        </div>
    );
}

function HtmlEvidencePanel({ evidence }: { evidence: AgencyEvidenceHtml | undefined }) {
    if (!evidence) {
        return (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                Nenhum HTML selecionado.
            </div>
        );
    }

    return (
        <div className="min-w-0 rounded-md border">
            <div className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Amostra {evidence.sample_index + 1}</Badge>
                    <Badge variant="secondary">Hash {evidence.content_hash}</Badge>
                </div>
                <div className="break-all text-sm font-medium">{evidence.url}</div>
            </div>
            <Separator />
            <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed">
                {evidence.html}
            </pre>
        </div>
    );
}

function buildFieldSummaries(extractors: AgencyFieldExtractor[]): FieldExtractorSummary[] {
    const summaries = new Map<string, AgencyFieldExtractor[]>();

    for (const extractor of extractors) {
        const fieldExtractors = summaries.get(extractor.field_name) ?? [];
        fieldExtractors.push(extractor);
        summaries.set(extractor.field_name, fieldExtractors);
    }

    return Array.from(summaries.entries())
        .map(([fieldName, fieldExtractors]) => ({
            fieldName,
            extractors: [...fieldExtractors].sort((a, b) => a.priority - b.priority || a.id - b.id),
        }))
        .sort((a, b) => a.fieldName.localeCompare(b.fieldName));
}

function primaryExtractorLabel(extractors: AgencyFieldExtractor[]): string {
    const primary = extractors[0];
    if (!primary) return "sem extractor";
    return `p${primary.priority} ${primary.source_type} ${primary.selector_value}`;
}

function formatExtractorCount(count: number): string {
    return count === 1 ? "1 extractor" : `${count} extractors`;
}
