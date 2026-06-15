"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Database,
    FileCode2,
    FileWarning,
    ListChecks,
    Plus,
    RotateCcw,
    Save,
    Trash2,
} from "lucide-react";

import { useAgencyExtractorRefinement } from "@/hooks/useAgencyExtractorRefinement";
import { useExtractorRefinementPreview } from "@/hooks/useExtractorRefinementPreview";
import type {
    AgencyFieldExtractor,
    AgencyType,
    ExtractorOutputType,
    ExtractorSourceType,
} from "@/types/agencyConfig";
import type {
    AgencyEvidenceHtml,
    ExtractorRefinementPreviewResult,
    ExtractorRefinementSaveExtractor,
} from "@/types/agencyRefinement";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { saveExtractorRefinement } from "@/services/agencyConfigService";
import { useQueryClient } from "@tanstack/react-query";
import { AGENCY_EXTRACTOR_REFINEMENT_QUERY_KEY } from "@/hooks/useAgencyExtractorRefinement";

interface ExtractorRefinementClientProps {
    agencyType: AgencyType;
    agencyId: number;
}

interface FieldExtractorSummary {
    fieldName: string;
    extractors: AgencyFieldExtractor[];
}

const SOURCE_TYPES: ExtractorSourceType[] = ["xpath", "css", "og", "jsonld", "literal"];
const OUTPUT_TYPES: ExtractorOutputType[] = ["text", "number", "boolean", "image_url", "link_url"];

export function ExtractorRefinementClient({ agencyType, agencyId }: ExtractorRefinementClientProps) {
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useAgencyExtractorRefinement(agencyType, agencyId);
    const [selectedFieldName, setSelectedFieldName] = useState<string | null>(null);
    const [selectedEvidenceId, setSelectedEvidenceId] = useState<number | null>(null);
    const [draftExtractors, setDraftExtractors] = useState<AgencyFieldExtractor[]>([]);
    const [dirty, setDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

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

    useEffect(() => {
        if (selectedField) {
            setDraftExtractors(selectedField.extractors.map((extractor) => ({ ...extractor })));
            setDirty(false);
            setSaveError(null);
        } else {
            setDraftExtractors([]);
        }
    }, [selectedField]);

    const preview = useExtractorRefinementPreview({
        fieldName: selectedField?.fieldName ?? null,
        extractors: draftExtractors,
        evidence: data?.evidence ?? [],
        enabled: Boolean(data?.evidence_available) && draftExtractors.length > 0,
    });
    const selectedPreview = selectedEvidence
        ? preview.data?.results.find((result) => result.evidence_id === selectedEvidence.id)
        : undefined;

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

    const handleUpdateExtractor = (index: number, patch: Partial<AgencyFieldExtractor>) => {
        setDraftExtractors((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], ...patch };
            return next;
        });
        setDirty(true);
        setSaveError(null);
    };

    const handleAddExtractor = () => {
        if (!selectedField) return;
        const nextPriority = draftExtractors.length > 0 ? Math.max(...draftExtractors.map((e) => e.priority)) + 1 : 1;
        const base: AgencyFieldExtractor = {
            id: 0,
            agency_type: agencyType,
            agency_id: agencyId,
            field_name: selectedField.fieldName,
            priority: nextPriority,
            source_type: "css",
            selector_value: "",
            selector_index: null,
            selector_params: null,
            selector_join: false,
            pipeline: null,
            output_type: "text",
            is_optional: false,
            created_at: undefined,
            updated_at: undefined,
        };
        setDraftExtractors((prev) => [...prev, base]);
        setDirty(true);
        setSaveError(null);
    };

    const handleRemoveExtractor = (index: number) => {
        setDraftExtractors((prev) => prev.filter((_, i) => i !== index));
        setDirty(true);
        setSaveError(null);
    };

    const handleReset = () => {
        if (selectedField) {
            setDraftExtractors(selectedField.extractors.map((extractor) => ({ ...extractor })));
            setDirty(false);
            setSaveError(null);
        }
    };

    const handleSave = async () => {
        if (!selectedField || draftExtractors.length === 0) return;
        setIsSaving(true);
        setSaveError(null);
        try {
            const payload = {
                field_name: selectedField.fieldName,
                extractors: draftExtractors.map(
                    (extractor): ExtractorRefinementSaveExtractor => ({
                        id: extractor.id > 0 ? extractor.id : undefined,
                        field_name: extractor.field_name,
                        source_type: extractor.source_type,
                        selector_value: extractor.selector_value,
                        selector_index: extractor.selector_index,
                        selector_join: extractor.selector_join,
                        selector_params: extractor.selector_params,
                        pipeline: extractor.pipeline,
                        output_type: extractor.output_type,
                        priority: extractor.priority,
                        is_optional: extractor.is_optional,
                    })
                ),
            };
            await saveExtractorRefinement(agencyType, agencyId, payload);
            await queryClient.invalidateQueries({
                queryKey: [...AGENCY_EXTRACTOR_REFINEMENT_QUERY_KEY, agencyType, agencyId],
            });
            setDirty(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Erro ao salvar refinamento.";
            setSaveError(message);
        } finally {
            setIsSaving(false);
        }
    };

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
                        Rode o Cadastrador ou reonboard para capturar a Amostra de Torneio antes de verificar os
                        Extractors.
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
                                <div className="flex flex-wrap items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddExtractor}
                                        disabled={!selectedField || isSaving}
                                    >
                                        <Plus className="mr-1 h-4 w-4" />
                                        Adicionar fallback
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => preview.refetch()}
                                        disabled={!selectedField || draftExtractors.length === 0}
                                    >
                                        <RotateCcw className="mr-1 h-4 w-4" />
                                        Testar
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={!dirty || isSaving || draftExtractors.length === 0}
                                    >
                                        <Save className="mr-1 h-4 w-4" />
                                        {isSaving ? "Salvando..." : "Salvar"}
                                    </Button>
                                    {dirty && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleReset}
                                            disabled={isSaving}
                                        >
                                            Desfazer
                                        </Button>
                                    )}
                                </div>

                                {saveError && (
                                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {saveError}
                                    </div>
                                )}

                                {draftExtractors.length === 0 && selectedField && (
                                    <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                                        Nenhuma prioridade para este campo. Adicione um fallback para começar.
                                    </div>
                                )}

                                {draftExtractors.map((extractor, index) => (
                                    <ExtractorEditor
                                        key={`${extractor.field_name}-${index}`}
                                        editorId={String(index)}
                                        extractor={extractor}
                                        onChange={(patch) => handleUpdateExtractor(index, patch)}
                                        onRemove={() => handleRemoveExtractor(index)}
                                        canRemove={draftExtractors.length > 1}
                                        disabled={isSaving}
                                    />
                                ))}
                            </div>

                            <HtmlEvidencePanel
                                evidence={selectedEvidence}
                                previewResult={selectedPreview}
                                isPreviewLoading={preview.isLoading}
                                hasPreviewError={Boolean(preview.error)}
                            />
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

interface ExtractorEditorProps {
    editorId: string;
    extractor: AgencyFieldExtractor;
    onChange: (patch: Partial<AgencyFieldExtractor>) => void;
    onRemove: () => void;
    canRemove: boolean;
    disabled: boolean;
}

function ExtractorEditor({ editorId, extractor, onChange, onRemove, canRemove, disabled }: ExtractorEditorProps) {
    return (
        <div className="rounded-md border p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge>Prioridade {extractor.priority}</Badge>
                    <Badge variant="outline">{extractor.source_type}</Badge>
                    <Badge variant="secondary">{extractor.output_type}</Badge>
                    {extractor.is_optional && <Badge variant="outline">Opcional</Badge>}
                </div>
                {canRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        disabled={disabled}
                        aria-label="Remover prioridade"
                    >
                        <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                )}
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <Label htmlFor={`field-${editorId}`} className="text-xs">Campo</Label>
                    <Input id={`field-${editorId}`} value={extractor.field_name} disabled className="bg-muted" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                        <Label htmlFor={`source-${editorId}`} className="text-xs">Tipo de fonte</Label>
                        <Select
                            value={extractor.source_type}
                            onValueChange={(value) => onChange({ source_type: value as ExtractorSourceType })}
                            disabled={disabled}
                        >
                            <SelectTrigger id={`source-${editorId}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {SOURCE_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor={`output-${editorId}`} className="text-xs">Tipo de saída</Label>
                        <Select
                            value={extractor.output_type}
                            onValueChange={(value) => onChange({ output_type: value as ExtractorOutputType })}
                            disabled={disabled}
                        >
                            <SelectTrigger id={`output-${editorId}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {OUTPUT_TYPES.map((type) => (
                                    <SelectItem key={type} value={type}>
                                        {type}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-1">
                    <Label htmlFor={`selector-${editorId}`} className="text-xs">Selector / Valor</Label>
                    <Input
                        id={`selector-${editorId}`}
                        value={extractor.selector_value}
                        onChange={(e) => onChange({ selector_value: e.target.value })}
                        disabled={disabled}
                        placeholder="h1::text"
                    />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1">
                        <Label htmlFor={`priority-${editorId}`} className="text-xs">Prioridade</Label>
                        <Input
                            id={`priority-${editorId}`}
                            type="number"
                            min={1}
                            value={extractor.priority}
                            onChange={(e) => onChange({ priority: Number(e.target.value) })}
                            disabled={disabled}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor={`index-${editorId}`} className="text-xs">Índice</Label>
                        <Input
                            id={`index-${editorId}`}
                            type="number"
                            min={0}
                            value={extractor.selector_index ?? ""}
                            onChange={(e) =>
                                onChange({
                                    selector_index: e.target.value === "" ? null : Number(e.target.value),
                                })
                            }
                            disabled={disabled}
                            placeholder="primeiro"
                        />
                    </div>

                    <div className="flex items-center gap-2 self-end pb-2">
                        <Switch
                            id={`join-${editorId}`}
                            checked={extractor.selector_join}
                            onCheckedChange={(checked) => onChange({ selector_join: checked })}
                            disabled={disabled}
                        />
                        <Label htmlFor={`join-${editorId}`} className="text-xs">
                            Unir matches
                        </Label>
                    </div>
                </div>

                <div className="space-y-1">
                    <Label htmlFor={`pipeline-${editorId}`} className="text-xs">Pipeline</Label>
                    <Input
                        id={`pipeline-${editorId}`}
                        value={extractor.pipeline ?? ""}
                        onChange={(e) => onChange({ pipeline: e.target.value === "" ? null : e.target.value })}
                        disabled={disabled}
                        placeholder="lower, trim"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Switch
                        id={`optional-${editorId}`}
                        checked={extractor.is_optional}
                        onCheckedChange={(checked) => onChange({ is_optional: checked })}
                        disabled={disabled}
                    />
                    <Label htmlFor={`optional-${editorId}`} className="text-xs">
                        Campo opcional
                    </Label>
                </div>
            </div>
        </div>
    );
}

function HtmlEvidencePanel({
    evidence,
    previewResult,
    isPreviewLoading,
    hasPreviewError,
}: {
    evidence: AgencyEvidenceHtml | undefined;
    previewResult: ExtractorRefinementPreviewResult | undefined;
    isPreviewLoading: boolean;
    hasPreviewError: boolean;
}) {
    if (!evidence) {
        return (
            <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                Nenhum HTML selecionado.
            </div>
        );
    }

    const fragments = previewResult?.selected_evidence?.fragments ?? [];
    const highlightedHtml = buildHighlightedHtml(evidence.html, fragments);
    const codeSegments = splitHighlightedHtml(evidence.html, fragments);

    return (
        <div className="min-w-0 rounded-md border">
            <div className="space-y-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Amostra {evidence.sample_index + 1}</Badge>
                    <Badge variant="secondary">Hash {evidence.content_hash}</Badge>
                    {previewResult && <Badge>{previewResult.status}</Badge>}
                    {isPreviewLoading && <Badge variant="outline">Calculando destaque</Badge>}
                    {hasPreviewError && <Badge variant="destructive">Erro no preview</Badge>}
                </div>
                <div className="break-all text-sm font-medium">{evidence.url}</div>
                {previewResult?.value && (
                    <div className="text-sm text-muted-foreground">Valor: {previewResult.value}</div>
                )}
            </div>
            <Separator />
            <div className="grid gap-0 xl:grid-cols-2">
                <section className="min-w-0 border-b xl:border-b-0 xl:border-r">
                    <div className="border-b px-3 py-2">
                        <h3 className="text-sm font-semibold">Visualização renderizada</h3>
                    </div>
                    <iframe
                        title="Visualização renderizada da Evidencia HTML"
                        srcDoc={highlightedHtml}
                        sandbox=""
                        className="h-[460px] w-full bg-white"
                    />
                </section>
                <section className="min-w-0">
                    <div className="border-b px-3 py-2">
                        <h3 className="text-sm font-semibold">Código HTML</h3>
                    </div>
                    <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap break-words p-3 text-xs leading-relaxed">
                        {codeSegments.map((segment, index) =>
                            segment.highlighted ? (
                                <mark key={index} className="rounded-sm bg-yellow-200 px-0.5 text-foreground">
                                    {segment.text}
                                </mark>
                            ) : (
                                <span key={index}>{segment.text}</span>
                            )
                        )}
                    </pre>
                </section>
            </div>
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

interface HighlightSegment {
    text: string;
    highlighted: boolean;
}

interface HighlightRange {
    start: number;
    end: number;
}

function buildHighlightedHtml(html: string, fragments: string[]): string {
    const ranges = findHighlightRanges(html, fragments);
    if (ranges.length === 0) return injectHighlightStyle(html);

    let cursor = 0;
    let output = "";
    for (const range of ranges) {
        output += html.slice(cursor, range.start);
        output += `<mark data-refinement-highlight>${html.slice(range.start, range.end)}</mark>`;
        cursor = range.end;
    }
    output += html.slice(cursor);

    return injectHighlightStyle(output);
}

function splitHighlightedHtml(html: string, fragments: string[]): HighlightSegment[] {
    const ranges = findHighlightRanges(html, fragments);
    if (ranges.length === 0) return [{ text: html, highlighted: false }];

    const segments: HighlightSegment[] = [];
    let cursor = 0;
    for (const range of ranges) {
        if (range.start > cursor) {
            segments.push({ text: html.slice(cursor, range.start), highlighted: false });
        }
        segments.push({ text: html.slice(range.start, range.end), highlighted: true });
        cursor = range.end;
    }
    if (cursor < html.length) {
        segments.push({ text: html.slice(cursor), highlighted: false });
    }
    return segments;
}

function findHighlightRanges(html: string, fragments: string[]): HighlightRange[] {
    const ranges = fragments
        .map((fragment) => fragment.trim())
        .filter(Boolean)
        .map((fragment) => {
            const start = html.indexOf(fragment);
            return start >= 0 ? { start, end: start + fragment.length } : null;
        })
        .filter((range): range is HighlightRange => range !== null)
        .sort((a, b) => a.start - b.start || b.end - a.end);

    const nonOverlapping: HighlightRange[] = [];
    for (const range of ranges) {
        const previous = nonOverlapping[nonOverlapping.length - 1];
        if (!previous || range.start >= previous.end) {
            nonOverlapping.push(range);
        }
    }
    return nonOverlapping;
}

function injectHighlightStyle(html: string): string {
    const style = [
        "<style>",
        "mark[data-refinement-highlight]{background:#fde047;color:inherit;padding:0 .12em;border-radius:2px;}",
        "</style>",
    ].join("");
    return html.match(/<\/head>/i)
        ? html.replace(/<\/head>/i, `${style}</head>`)
        : `${style}${html}`;
}
