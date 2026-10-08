"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Calculator,
  Check,
  CircleAlert,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  History,
  Home,
  ListChecks,
  Loader2,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { DEFAULT_PAGE_SIZE, PaginationFooter } from "@/components/layout/PaginationFooter";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createValuation,
  downloadValuationComparables,
  downloadValuationReport,
  downloadValuationWordReport,
  getValuationCandidates,
  getValuation,
  getValuations,
} from "@/services/valuationService";
import { getMarketPropertyFilters } from "@/services/marketPropertyService";
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
import { useClientPagination } from "@/hooks/useClientPagination";
import type {
  ComparableCandidate,
  ComparableReview,
  ComparableReviewDecision,
  ComparableReviewStatus,
  ResidentialType,
  Valuation,
  ValuationInput,
} from "@/types/valuation";

const residentialTypes: Array<{ value: ResidentialType; label: string }> = [
  { value: "house", label: "Casa" },
  { value: "apartment", label: "Apartamento" },
  { value: "townhouse", label: "Sobrado" },
];

const initialInput: ValuationInput = {
  city: [],
  neighborhood: [],
  residential_type: "house",
  area: 100,
  bedrooms: 3,
  bathrooms: 2,
  garage_spaces: 1,
  flood_risk: false,
};

type DownloadFormat = "pdf" | "word" | "excel";

const reviewStatusLabels: Record<ComparableReviewStatus, string> = {
  pending: "Pendente",
  approved: "Válido",
  rejected: "Inválido",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Math.round(value / 1000) * 1000);
}

function nextReviewStatus(status: ComparableReviewStatus): ComparableReviewStatus {
  if (status === "pending") return "approved";
  if (status === "approved") return "rejected";
  return "pending";
}

function reviewStatusClassName(status: ComparableReviewStatus): string {
  if (status === "approved") {
    return "border-success/30 bg-success/10 text-success hover:bg-success/15 hover:text-success dark:bg-success/10 dark:hover:bg-success/15";
  }

  if (status === "rejected") {
    return "border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive dark:bg-destructive/5 dark:hover:bg-destructive/10";
  }

  return "border-border bg-muted text-muted-foreground hover:bg-muted/70";
}

const reviewStatusBadgeVariants: Record<ComparableReviewStatus, "muted" | "success" | "destructive"> = {
  pending: "muted",
  approved: "success",
  rejected: "destructive",
};

function valuationStatusBadgeVariant(status: Valuation["status"]): "success" | "warning" | "muted" {
  if (status === "calculated") return "success";
  if (status === "insufficient_sample") return "warning";
  return "muted";
}

const multiSelectClassName =
  "w-full min-w-0 rounded-lg border border-input bg-background px-1.5 py-1.5 text-sm shadow-xs shadow-black/5 transition-colors outline-none hover:border-muted-foreground/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 [&>option]:rounded-md [&>option]:px-2 [&>option]:py-1 [&>option:checked]:bg-primary/10 [&>option:checked]:text-primary";

function comparableReviewsFrom(candidates: ComparableCandidate[]): ComparableReview[] | null {
  const reviews: ComparableReview[] = [];

  for (const candidate of candidates) {
    if (candidate.review_status === "pending") {
      return null;
    }

    reviews.push({
      market_property_id: candidate.market_property_id,
      status: candidate.review_status,
    });
  }

  return reviews;
}

export function ValuationsClient() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<ValuationInput>(initialInput);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [historyPage, setHistoryPage] = useState({ page: 1, pageCount: 1, total: 0 });
  const [selected, setSelected] = useState<Valuation | null>(null);
  const [candidates, setCandidates] = useState<ComparableCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(() => new Set());
  // Bumped on every search so the review table starts again on its first page.
  const [candidateSearch, setCandidateSearch] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : null;
  const canCreate = permissions?.includes("valuations.create") ?? false;
  const canView = permissions?.includes("valuations.view") ?? false;
  const hasValuationAccess = canCreate || canView;

  const selectedComparables = selected?.comparable_evidence ?? [];
  const selectedRange = selected?.final_range;
  const pendingCandidates = candidates.filter((candidate) => candidate.review_status === "pending").length;
  const approvedCandidates = candidates.filter((candidate) => candidate.review_status === "approved").length;
  const rejectedCandidates = candidates.filter((candidate) => candidate.review_status === "rejected").length;
  const canCalculateReviewedValuation = candidates.length > 0 && pendingCandidates === 0 && approvedCandidates > 0;

  const sampleLabel = useMemo(() => {
    if (!selected) return "";
    const summary = selected.sample_summary;
    if (selected.status === "insufficient_sample") {
      return `${summary.total_found ?? 0} encontrados, mínimo de ${summary.minimum_required ?? 5}`;
    }
    return `${summary.used_count ?? 0} usados, ${summary.invalid_count ?? 0} inválidos, ${summary.outlier_count ?? 0} outliers`;
  }, [selected]);

  useEffect(() => {
    async function loadAccess() {
      if (permissions !== null) {
        setIsLoadingAccess(false);
        return;
      }

      try {
        const response = await authService.getUser();
        setUser(response.data.data ?? response.data);
      } catch (error) {
        console.error("Erro ao carregar permissões do usuário", error);
      } finally {
        setIsLoadingAccess(false);
      }
    }

    void loadAccess();
  }, [permissions, setUser]);

  useEffect(() => {
    if (isLoadingAccess) {
      return;
    }

    if (canView) {
      void loadHistory();
      return;
    }

    setIsLoadingHistory(false);
  }, [canView, isLoadingAccess]);

  useEffect(() => {
    async function loadFilters() {
      setIsLoadingFilters(true);
      try {
        const filters = await getMarketPropertyFilters();
        setAvailableCities(filters.cidades);
        setAvailableNeighborhoods(filters.bairros);
      } catch (error) {
        console.error("Erro ao carregar filtros de localidade", error);
        toast.error("Não foi possível carregar as cidades e bairros disponíveis.");
      } finally {
        setIsLoadingFilters(false);
      }
    }

    void loadFilters();
  }, []);

  async function loadHistory(page = 1) {
    setIsLoadingHistory(true);
    try {
      const response = await getValuations(page, DEFAULT_PAGE_SIZE);
      setValuations(response.data);
      setHistoryPage({
        page: response.meta.current_page,
        pageCount: response.meta.last_page,
        total: response.meta.total,
      });
      setSelected((current) => current ?? response.data[0] ?? null);
    } catch (error) {
      console.error("Erro ao carregar avaliações", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  function updateNumber(field: keyof Pick<ValuationInput, "area" | "bedrooms" | "bathrooms" | "garage_spaces">, value: string) {
    setForm((current) => ({
      ...current,
      [field]: Number(value),
    }));
  }

  function updateMultiSelect(field: "city" | "neighborhood", select: HTMLSelectElement) {
    const selected: string[] = Array.from(select.selectedOptions).map((option) => option.value);

    setForm((current) => ({ ...current, [field]: selected }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;

    if (form.city.length === 0 || form.neighborhood.length === 0) {
      toast.error("Selecione pelo menos uma cidade e um bairro.");
      return;
    }

    setIsLoadingCandidates(true);
    try {
      const comparableCandidates = await getValuationCandidates(form);
      setCandidates(comparableCandidates);
      setCandidateSearch((current) => current + 1);
      setSelectedCandidateIds(new Set());
      toast.success(`${comparableCandidates.length} comparáveis encontrados para revisão.`);
    } catch (error) {
      console.error("Erro ao buscar comparáveis", error);
      toast.error("Não foi possível buscar os comparáveis.");
    } finally {
      setIsLoadingCandidates(false);
    }
  }

  async function handleCreateReviewedValuation() {
    if (!canCreate) return;

    const comparableReviews = comparableReviewsFrom(candidates);

    if (comparableReviews === null) {
      toast.error("Revise todos os comparáveis antes de calcular.");
      return;
    }

    if (!comparableReviews.some((review) => review.status === "approved")) {
      toast.error("Marque pelo menos um comparável como válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const valuation = await createValuation({
        ...form,
        comparable_reviews: comparableReviews,
      });
      setSelected(valuation);
      setCandidates([]);
      setSelectedCandidateIds(new Set());
      if (canView) {
        await loadHistory();
      }
      toast.success("Avaliação calculada com sucesso.");
    } catch (error) {
      console.error("Erro ao criar avaliação", error);
      toast.error("Não foi possível criar a avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function toggleCandidateSelection(candidateId: number, checked: boolean) {
    setSelectedCandidateIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(candidateId);
      } else {
        next.delete(candidateId);
      }

      return next;
    });
  }

  function selectAllCandidates() {
    setSelectedCandidateIds(new Set(candidates.map((candidate) => candidate.market_property_id)));
  }

  function clearCandidateSelection() {
    setSelectedCandidateIds(new Set());
  }

  function markSelectedCandidates(status: ComparableReviewDecision) {
    setCandidates((current) =>
      current.map((candidate) =>
        selectedCandidateIds.has(candidate.market_property_id)
          ? { ...candidate, review_status: status }
          : candidate
      )
    );
    setSelectedCandidateIds(new Set());
  }

  function cycleCandidateStatus(candidateId: number) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.market_property_id === candidateId
          ? { ...candidate, review_status: nextReviewStatus(candidate.review_status) }
          : candidate
      )
    );
  }

  async function handleSelect(valuationId: number) {
    if (!canView) return;

    try {
      const valuation = await getValuation(valuationId);
      setSelected(valuation);
    } catch (error) {
      console.error("Erro ao abrir avaliação", error);
      toast.error("Não foi possível abrir a avaliação.");
    }
  }

  async function handleDownload(format: DownloadFormat) {
    if (!selected || !selected.can_download_report || !canView) return;

    setDownloadingFormat(format);
    try {
      if (format === "pdf") {
        await downloadValuationReport(selected);
      } else if (format === "word") {
        await downloadValuationWordReport(selected);
      } else {
        await downloadValuationComparables(selected);
      }
    } catch (error) {
      console.error("Erro ao baixar arquivo da avaliação", error);
      toast.error("Não foi possível baixar o arquivo.");
    } finally {
      setDownloadingFormat(null);
    }
  }

  function handleNewValuation() {
    setForm(initialInput);
    setCandidates([]);
    setSelectedCandidateIds(new Set());
    setSelected(null);
  }

  if (isLoadingAccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando permissões...
      </div>
    );
  }

  if (!hasValuationAccess) {
    return (
      <div className="space-y-6">
        <PageHeader title="Avaliar imóvel" />
        <EmptyState
          description="Você não tem permissão para avaliar imóveis ou consultar avaliações."
          icon={Lock}
          title="Acesso indisponível"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          canCreate && (
            <Button type="button" variant="outline" onClick={handleNewValuation}>
              <Plus />
              Nova avaliação
            </Button>
          )
        }
        description="Calcule uma avaliação de mercado com base em imóveis comparáveis da base."
        title="Avaliar imóvel"
      />

      <div className={canCreate ? "grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]" : "grid gap-6"}>
        {canCreate && (
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-4 text-muted-foreground" />
                Imóvel avaliado
              </CardTitle>
              <CardDescription>
                Informe as características usadas para buscar comparáveis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-5" onSubmit={handleSubmit}>
                <FormField
                  hint="Segure Ctrl (ou Cmd) para selecionar várias cidades."
                  htmlFor="city"
                  label="Cidade"
                >
                  <select
                    id="city"
                    multiple
                    value={form.city}
                    onChange={(event) => updateMultiSelect("city", event.target as HTMLSelectElement)}
                    disabled={isLoadingFilters}
                    className={multiSelectClassName}
                    size={5}
                    required
                  >
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  hint="Segure Ctrl (ou Cmd) para selecionar vários bairros."
                  htmlFor="neighborhood"
                  label="Bairro"
                >
                  <select
                    id="neighborhood"
                    multiple
                    value={form.neighborhood}
                    onChange={(event) => updateMultiSelect("neighborhood", event.target as HTMLSelectElement)}
                    disabled={isLoadingFilters}
                    className={multiSelectClassName}
                    size={5}
                    required
                  >
                    {availableNeighborhoods.map((neighborhood) => (
                      <option key={neighborhood} value={neighborhood}>
                        {neighborhood}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField htmlFor="residential_type" label="Tipo residencial">
                  <Select
                    value={form.residential_type}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, residential_type: value as ResidentialType }))
                    }
                  >
                    <SelectTrigger className="w-full" id="residential_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {residentialTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <div className="grid grid-cols-2 gap-5">
                  <FormField htmlFor="area" label="Metragem">
                    <Input
                      id="area"
                      type="number"
                      min={20}
                      max={2000}
                      value={form.area}
                      onChange={(event) => updateNumber("area", event.target.value)}
                      required
                    />
                  </FormField>
                  <FormField htmlFor="bedrooms" label="Quartos">
                    <Input
                      id="bedrooms"
                      type="number"
                      min={0}
                      max={10}
                      value={form.bedrooms}
                      onChange={(event) => updateNumber("bedrooms", event.target.value)}
                      required
                    />
                  </FormField>
                  <FormField htmlFor="bathrooms" label="Banheiros">
                    <Input
                      id="bathrooms"
                      type="number"
                      min={0}
                      max={10}
                      value={form.bathrooms}
                      onChange={(event) => updateNumber("bathrooms", event.target.value)}
                      required
                    />
                  </FormField>
                  <FormField htmlFor="garage_spaces" label="Vagas">
                    <Input
                      id="garage_spaces"
                      type="number"
                      min={0}
                      max={10}
                      value={form.garage_spaces}
                      onChange={(event) => updateNumber("garage_spaces", event.target.value)}
                      required
                    />
                  </FormField>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="flood_risk">Risco de enchente</Label>
                    <p className="text-xs text-muted-foreground">Aplica um ajuste negativo ao valor final.</p>
                  </div>
                  <Switch
                    id="flood_risk"
                    checked={form.flood_risk}
                    onCheckedChange={(checked) => setForm((current) => ({ ...current, flood_risk: checked }))}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isLoadingCandidates || isLoadingFilters}>
                  {isLoadingCandidates ? <Loader2 className="animate-spin" /> : <Search />}
                  Buscar comparáveis
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="min-w-0 space-y-6">
          {canCreate && candidates.length > 0 && (
            <ComparableReviewPanel
              key={candidateSearch}
              candidates={candidates}
              selectedCandidateIds={selectedCandidateIds}
              pendingCount={pendingCandidates}
              approvedCount={approvedCandidates}
              rejectedCount={rejectedCandidates}
              isSubmitting={isSubmitting}
              canCalculate={canCalculateReviewedValuation}
              onToggleSelected={toggleCandidateSelection}
              onMarkSelected={markSelectedCandidates}
              onSelectAll={selectAllCandidates}
              onClearSelection={clearCandidateSelection}
              onCycleStatus={cycleCandidateStatus}
              onCalculate={() => void handleCreateReviewedValuation()}
            />
          )}

          <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader
              actions={
                selected && (
                  <Badge variant={valuationStatusBadgeVariant(selected.status)}>
                    {selected.status_label}
                  </Badge>
                )
              }
              description={selected ? `${selected.code} - ${selected.status_label}` : "Nenhuma avaliação selecionada"}
              icon={Target}
              title="Resultado"
            />
            {!selected ? (
              <EmptyState
                description="Crie uma avaliação ou selecione um registro do histórico."
                icon={Calculator}
                title="Nenhuma avaliação selecionada"
                variant="inline"
              />
            ) : (
              <div className="space-y-5 p-4 sm:p-5">
                {selectedRange ? (
                  <>
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 sm:p-5">
                      <p className="text-xs tracking-wide text-primary uppercase">Valor estimado</p>
                      <p className="mt-2 text-4xl leading-none tracking-tight text-foreground tabular-nums">
                        {selectedRange.display.central}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground tabular-nums">
                        Faixa de mercado entre {selectedRange.display.min} e {selectedRange.display.max}
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <RangeTile icon={TrendingDown} label="Mínimo" tone="info" value={selectedRange.display.min} />
                      <RangeTile icon={Target} label="Central" tone="primary" value={selectedRange.display.central} />
                      <RangeTile icon={TrendingUp} label="Máximo" tone="success" value={selectedRange.display.max} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                    <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                    <div className="space-y-1">
                      <p className="text-foreground">Amostra insuficiente</p>
                      <p className="text-muted-foreground">{selected.calculation_summary}</p>
                    </div>
                  </div>
                )}

                {selected.flood_adjustment_percent !== null && (
                  <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
                    <p className="text-foreground">
                      Ajuste aplicado: -{selected.flood_adjustment_percent}% por risco de enchente informado.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4 text-sm">
                    <p className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                      <Home className="size-3.5" />
                      Imóvel avaliado
                    </p>
                    <p className="mt-2 text-foreground">
                      {selected.subject_property.residential_type_label} em {selected.subject_property.neighborhood},{" "}
                      {selected.subject_property.city}
                    </p>
                    <p className="mt-1 text-muted-foreground tabular-nums">
                      {formatNumber(selected.subject_property.area)} m², {selected.subject_property.bedrooms} quartos,{" "}
                      {selected.subject_property.bathrooms} banheiros, {selected.subject_property.garage_spaces} vagas
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 text-sm">
                    <p className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
                      <Users className="size-3.5" />
                      Amostra
                    </p>
                    <p className="mt-2 text-foreground tabular-nums">{sampleLabel}</p>
                    {selectedRange && <p className="mt-1 text-muted-foreground">{selected.calculation_summary}</p>}
                  </div>
                </div>

                {selected.can_download_report && canView && (
                  <div className="flex flex-wrap justify-end gap-2 border-t pt-5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleDownload("excel")}
                      disabled={downloadingFormat === "excel"}
                    >
                      {downloadingFormat === "excel" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />}
                      Exportar Excel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleDownload("word")}
                      disabled={downloadingFormat === "word"}
                    >
                      {downloadingFormat === "word" ? <Loader2 className="animate-spin" /> : <FileText />}
                      Baixar Word
                    </Button>
                    <Button
                      type="button"
                      onClick={() => void handleDownload("pdf")}
                      disabled={downloadingFormat === "pdf"}
                    >
                      {downloadingFormat === "pdf" ? <Loader2 className="animate-spin" /> : <Download />}
                      Baixar PDF
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>

          {selected && <ComparableTable comparables={selectedComparables} key={selected.id} />}

          <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader
              description="Avaliações salvas da imobiliária."
              icon={History}
              title="Histórico"
            />
            {!canView ? (
              <EmptyState
                description="Você pode criar avaliações, mas não tem permissão para consultar o histórico."
                icon={Lock}
                title="Histórico indisponível"
                variant="inline"
              />
            ) : isLoadingHistory ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground sm:px-5">
                <Loader2 className="size-4 animate-spin" />
                Carregando avaliações...
              </div>
            ) : valuations.length === 0 ? (
              <EmptyState
                description="As avaliações calculadas aparecem aqui."
                icon={FileText}
                title="Nenhuma avaliação salva."
                variant="inline"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor central</TableHead>
                    <TableHead className="w-px">
                      <span className="sr-only">Ações</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {valuations.map((valuation) => (
                    <TableRow
                      key={valuation.id}
                      data-state={selected?.id === valuation.id ? "selected" : undefined}
                    >
                      <TableCell>
                        <p className="text-foreground tabular-nums">{valuation.code}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {valuation.subject_property.neighborhood}, {valuation.subject_property.city}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={valuationStatusBadgeVariant(valuation.status)}>
                          {valuation.status_label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-foreground tabular-nums">
                        {valuation.final_range?.display.central ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="outline" size="xs" onClick={() => void handleSelect(valuation.id)}>
                          Abrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {canView && (
              <PaginationFooter
                onPageChange={(page) => void loadHistory(page)}
                page={historyPage.page}
                pageCount={historyPage.pageCount}
                pageSize={DEFAULT_PAGE_SIZE}
                total={historyPage.total}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const rangeTileTones = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
} as const;

function RangeTile({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: keyof typeof rangeTileTones;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${rangeTileTones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl tracking-tight text-foreground tabular-nums">{value}</p>
    </div>
  );
}

interface ComparableReviewPanelProps {
  candidates: ComparableCandidate[];
  selectedCandidateIds: Set<number>;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  isSubmitting: boolean;
  canCalculate: boolean;
  onToggleSelected: (candidateId: number, checked: boolean) => void;
  onMarkSelected: (status: ComparableReviewDecision) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCycleStatus: (candidateId: number) => void;
  onCalculate: () => void;
}

function ComparableReviewPanel({
  candidates,
  selectedCandidateIds,
  pendingCount,
  approvedCount,
  rejectedCount,
  isSubmitting,
  canCalculate,
  onToggleSelected,
  onMarkSelected,
  onSelectAll,
  onClearSelection,
  onCycleStatus,
  onCalculate,
}: ComparableReviewPanelProps) {
  const selectedCount = selectedCandidateIds.size;
  const pagination = useClientPagination(candidates);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <SectionHeader
        actions={
          <>
            <Badge variant="muted" className="tabular-nums">
              {pendingCount} pendentes
            </Badge>
            <Badge variant="success" className="tabular-nums">
              {approvedCount} válidos
            </Badge>
            <Badge variant="destructive" className="tabular-nums">
              {rejectedCount} inválidos
            </Badge>
          </>
        }
        description={`${candidates.length} candidatos encontrados. Resolva todos os pendentes antes de calcular.`}
        icon={ListChecks}
        title="Revisão de comparáveis"
      />

      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={reviewStatusClassName("approved")}
          onClick={() => onMarkSelected("approved")}
          disabled={selectedCount === 0}
        >
          <Check />
          Marcar como válido
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={reviewStatusClassName("rejected")}
          onClick={() => onMarkSelected("rejected")}
          disabled={selectedCount === 0}
        >
          <X />
          Marcar como inválido
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onSelectAll}
          disabled={candidates.length === 0}
        >
          Selecionar todos
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={selectedCount === 0}
        >
          Limpar seleção
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums sm:ml-auto">
          {selectedCount} selecionados
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10" />
            <TableHead>Status</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Bairro</TableHead>
            <TableHead className="text-right">Área</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Valor/m²</TableHead>
            <TableHead>Imóvel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.map((candidate) => {
            const agencyLabel = candidate.agency ?? `#${candidate.market_property_id}`;
            const isSelected = selectedCandidateIds.has(candidate.market_property_id);

            return (
              <TableRow key={candidate.market_property_id} data-state={isSelected ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    aria-label={`Selecionar comparável ${agencyLabel}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggleSelected(candidate.market_property_id, checked === true)}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    className={`rounded-full ${reviewStatusClassName(candidate.review_status)}`}
                    onClick={() => onCycleStatus(candidate.market_property_id)}
                    aria-label={`Status do comparável ${agencyLabel}: ${reviewStatusLabels[candidate.review_status]}`}
                  >
                    {reviewStatusLabels[candidate.review_status]}
                  </Button>
                </TableCell>
                <TableCell className="text-foreground">{candidate.agency ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{candidate.neighborhood}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(candidate.area)} m²</TableCell>
                <TableCell className="text-right text-foreground tabular-nums">{formatMoney(candidate.price)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(candidate.price_per_square_meter)}</TableCell>
                <TableCell>
                  {candidate.link ? (
                    <a
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      href={candidate.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visualizar imóvel
                      <ExternalLink className="size-3.5" />
                    </a>
                  ) : (
                    "-"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <PaginationFooter
        onPageChange={pagination.setPage}
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={pagination.total}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-5">
        <p className="text-xs text-muted-foreground">
          {canCalculate
            ? "Todos os comparáveis foram revisados."
            : "Marque cada comparável como válido ou inválido para liberar o cálculo."}
        </p>
        <Button type="button" onClick={onCalculate} disabled={!canCalculate || isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Calculator />}
          Calcular avaliação
        </Button>
      </div>
    </Card>
  );
}

function ComparableTable({ comparables }: { comparables: Valuation["comparable_evidence"] }) {
  const pagination = useClientPagination(comparables);

  if (comparables.length === 0) {
    return null;
  }

  const hasReviewStatus = comparables.some((comparable) => comparable.review_status);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <SectionHeader
        description={`${comparables.length} imóveis usados no cálculo.`}
        icon={ListChecks}
        title="Evidências comparáveis"
      />
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {hasReviewStatus && <TableHead>Status</TableHead>}
            <TableHead>Bairro</TableHead>
            <TableHead className="text-right">Área</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Valor/m²</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.map((comparable) => (
            <TableRow key={comparable.market_property_id}>
              {hasReviewStatus && (
                <TableCell>
                  {comparable.review_status ? (
                    <Badge variant={reviewStatusBadgeVariants[comparable.review_status]}>
                      {reviewStatusLabels[comparable.review_status]}
                    </Badge>
                  ) : (
                    "-"
                  )}
                </TableCell>
              )}
              <TableCell className="text-foreground">{comparable.neighborhood}</TableCell>
              <TableCell className="text-right tabular-nums">{formatNumber(comparable.area)} m²</TableCell>
              <TableCell className="text-right text-foreground tabular-nums">{formatMoney(comparable.price)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(comparable.price_per_square_meter)}</TableCell>
              <TableCell>
                {comparable.link ? (
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="block max-w-72 truncate text-sm text-foreground"
                      title={comparable.agency ?? undefined}
                    >
                      {comparable.agency ?? "Origem externa"}
                    </span>
                    <a
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      href={comparable.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visualizar imóvel
                      <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                ) : (
                  comparable.agency ?? "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <PaginationFooter
        onPageChange={pagination.setPage}
        page={pagination.page}
        pageCount={pagination.pageCount}
        pageSize={pagination.pageSize}
        total={pagination.total}
      />
    </Card>
  );
}
