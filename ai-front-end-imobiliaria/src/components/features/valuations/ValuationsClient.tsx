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
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { cn } from "@/lib/utils";
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
  ValuationRange,
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

type NumberField = keyof Pick<ValuationInput, "area" | "bedrooms" | "bathrooms" | "garage_spaces">;

// Limits the form enforces before searching comparables; the inputs only accept digits up to maxLength.
const numberFieldLimits: Record<NumberField, { min: number; max: number; maxLength: number; message: string }> = {
  area: { min: 20, max: 2000, maxLength: 4, message: "Informe entre 20 e 2.000 m²." },
  bedrooms: { min: 0, max: 10, maxLength: 2, message: "Informe um número entre 0 e 10." },
  bathrooms: { min: 0, max: 10, maxLength: 2, message: "Informe um número entre 0 e 10." },
  garage_spaces: { min: 0, max: 10, maxLength: 2, message: "Informe um número entre 0 e 10." },
};

const numberFields = Object.keys(numberFieldLimits) as NumberField[];

function numberFieldErrors(form: ValuationInput): Partial<Record<NumberField, string>> {
  const errors: Partial<Record<NumberField, string>> = {};

  for (const field of numberFields) {
    const { min, max, message } = numberFieldLimits[field];
    const value = form[field];

    if (!Number.isInteger(value) || value < min || value > max) {
      errors[field] = message;
    }
  }

  return errors;
}

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
  const [neighborhoodsByCity, setNeighborhoodsByCity] = useState<Record<string, string[]>>({});
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [touchedFields, setTouchedFields] = useState<Set<NumberField>>(() => new Set());
  const [submitAttempted, setSubmitAttempted] = useState(false);
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
        setNeighborhoodsByCity(filters.bairros_por_cidade ?? {});
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

  function updateNumber(field: NumberField, value: string) {
    // Digits only, capped to the field length, so letters and absurd values never reach the form.
    const digits = value.replace(/\D/g, "").slice(0, numberFieldLimits[field].maxLength);

    setForm((current) => ({
      ...current,
      [field]: Number(digits),
    }));
    setTouchedFields((current) => new Set(current).add(field));
  }

  const fieldErrors = numberFieldErrors(form);

  function visibleNumberError(field: NumberField): string | undefined {
    return submitAttempted || touchedFields.has(field) ? fieldErrors[field] : undefined;
  }

  const cityError = submitAttempted && form.city.length === 0 ? "Selecione pelo menos uma cidade." : undefined;
  const neighborhoodError =
    submitAttempted && form.neighborhood.length === 0 ? "Selecione pelo menos um bairro." : undefined;

  const visibleNeighborhoods = useMemo(() => {
    if (form.city.length === 0 || Object.keys(neighborhoodsByCity).length === 0) {
      return availableNeighborhoods;
    }

    return [...new Set(form.city.flatMap((city) => neighborhoodsByCity[city] ?? []))].sort(
      (left, right) => left.localeCompare(right, "pt-BR")
    );
  }, [availableNeighborhoods, form.city, neighborhoodsByCity]);

  function updateMultiSelect(field: "city" | "neighborhood", selected: string[]) {

    setForm((current) => {
      if (field === "city") {
        const validNeighborhoods =
          selected.length === 0 || Object.keys(neighborhoodsByCity).length === 0
            ? availableNeighborhoods
            : selected.flatMap((city) => neighborhoodsByCity[city] ?? []);

        return {
          ...current,
          city: selected,
          neighborhood: current.neighborhood.filter((n) => validNeighborhoods.includes(n)),
        };
      }

      return { ...current, [field]: selected };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;

    setSubmitAttempted(true);

    if (form.city.length === 0 || form.neighborhood.length === 0) {
      toast.error("Selecione pelo menos uma cidade e um bairro.");
      return;
    }

    if (Object.keys(numberFieldErrors(form)).length > 0) return;

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
    setTouchedFields(new Set());
    setSubmitAttempted(false);
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

      {canCreate && (
        <Card className="gap-0 py-0">
          <SectionHeader
            description="Informe as características usadas para buscar imóveis comparáveis na base."
            icon={Calculator}
            title="Imóvel avaliado"
          />
          <form className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <FormField error={cityError} htmlFor="city" label="Cidade">
                <MultiSelect
                  className={cityError ? "border-destructive" : undefined}
                  disabled={isLoadingFilters}
                  emptyMessage="Nenhuma cidade encontrada."
                  id="city"
                  onChange={(values) => updateMultiSelect("city", values)}
                  options={availableCities}
                  placeholder="Selecione as cidades"
                  searchPlaceholder="Buscar cidade"
                  value={form.city}
                />
              </FormField>

              <FormField error={neighborhoodError} htmlFor="neighborhood" label="Bairro">
                <MultiSelect
                  className={neighborhoodError ? "border-destructive" : undefined}
                  disabled={isLoadingFilters}
                  emptyMessage="Nenhum bairro encontrado."
                  id="neighborhood"
                  onChange={(values) => updateMultiSelect("neighborhood", values)}
                  options={visibleNeighborhoods}
                  placeholder="Selecione os bairros"
                  searchPlaceholder="Buscar bairro"
                  value={form.neighborhood}
                />
              </FormField>

              <FormField className="md:col-span-2 xl:col-span-1" htmlFor="residential_type" label="Tipo residencial">
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
            </div>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              <FormField error={visibleNumberError("area")} htmlFor="area" label="Metragem">
                <div className="relative">
                  <Input
                    aria-invalid={Boolean(visibleNumberError("area"))}
                    className="pr-12"
                    id="area"
                    inputMode="numeric"
                    type="text"
                    value={form.area}
                    onChange={(event) => updateNumber("area", event.target.value)}
                    required
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">
                    m²
                  </span>
                </div>
              </FormField>
              <FormField error={visibleNumberError("bedrooms")} htmlFor="bedrooms" label="Quartos">
                <Input
                  aria-invalid={Boolean(visibleNumberError("bedrooms"))}
                  id="bedrooms"
                  inputMode="numeric"
                  type="text"
                  value={form.bedrooms}
                  onChange={(event) => updateNumber("bedrooms", event.target.value)}
                  required
                />
              </FormField>
              <FormField error={visibleNumberError("bathrooms")} htmlFor="bathrooms" label="Banheiros">
                <Input
                  aria-invalid={Boolean(visibleNumberError("bathrooms"))}
                  id="bathrooms"
                  inputMode="numeric"
                  type="text"
                  value={form.bathrooms}
                  onChange={(event) => updateNumber("bathrooms", event.target.value)}
                  required
                />
              </FormField>
              <FormField error={visibleNumberError("garage_spaces")} htmlFor="garage_spaces" label="Vagas">
                <Input
                  aria-invalid={Boolean(visibleNumberError("garage_spaces"))}
                  id="garage_spaces"
                  inputMode="numeric"
                  type="text"
                  value={form.garage_spaces}
                  onChange={(event) => updateNumber("garage_spaces", event.target.value)}
                  required
                />
              </FormField>
            </div>

            <div className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  id="flood_risk"
                  checked={form.flood_risk}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, flood_risk: checked }))}
                />
                <div className="space-y-1">
                  <Label htmlFor="flood_risk">Risco de enchente</Label>
                  <p className="text-[0.8125rem] leading-4 text-subtle">Aplica um ajuste negativo ao valor final.</p>
                </div>
              </div>

              <Button
                className="w-full sm:w-auto sm:min-w-56"
                disabled={isLoadingCandidates || isLoadingFilters}
                size="lg"
                type="submit"
              >
                {isLoadingCandidates ? <Loader2 className="animate-spin" /> : <Search />}
                Buscar comparáveis
              </Button>
            </div>
          </form>
        </Card>
      )}

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

      <div className="grid gap-6 xl:grid-cols-12">
          <Card className="gap-0 overflow-hidden py-0 xl:col-span-8">
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
              <div className="flex flex-1 items-center justify-center px-6 pb-8 sm:px-8">
                <EmptyState
                  className="w-full rounded-xl bg-muted py-16"
                  description="Preencha o imóvel acima e busque comparáveis, ou abra uma avaliação do histórico."
                  icon={Calculator}
                  title="Nenhuma avaliação selecionada"
                  variant="inline"
                />
              </div>
            ) : (
              <div className="flex flex-1 flex-col gap-5 px-6 pb-6 sm:px-8 sm:pb-8">
                {selectedRange ? (
                  <>
                    <div className="rounded-xl border border-primary/40 bg-primary/10 p-5 sm:p-6">
                      <p className="text-sm leading-4 font-semibold text-primary">Valor estimado</p>
                      <p className="mt-3 text-[2rem] leading-9 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                        {selectedRange.display.central}
                      </p>
                      <p className="mt-2 text-sm text-subtle tabular-nums">
                        Faixa de mercado entre {selectedRange.display.min} e {selectedRange.display.max}
                      </p>
                      <RangeBar range={selectedRange} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <RangeTile icon={TrendingDown} label="Mínimo" tone="info" value={selectedRange.display.min} />
                      <RangeTile icon={Target} label="Central" tone="primary" value={selectedRange.display.central} />
                      <RangeTile icon={TrendingUp} label="Máximo" tone="success" value={selectedRange.display.max} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                    <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
                    <div className="space-y-1.5">
                      <p className="font-semibold text-foreground">Amostra insuficiente</p>
                      <p className="leading-5 text-muted-foreground">{selected.calculation_summary}</p>
                    </div>
                  </div>
                )}

                {selected.flood_adjustment_percent !== null && (
                  <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                    <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" />
                    <p className="text-foreground">
                      Ajuste aplicado: -{selected.flood_adjustment_percent}% por risco de enchente informado.
                    </p>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-transparent bg-muted p-5 text-sm">
                    <p className="flex items-center gap-2 text-[0.8125rem] leading-4 font-semibold text-subtle">
                      <Home className="size-4" />
                      Imóvel avaliado
                    </p>
                    <p className="mt-3 text-[0.9375rem] leading-5 font-medium text-foreground">
                      {selected.subject_property.residential_type_label} em {selected.subject_property.neighborhood},{" "}
                      {selected.subject_property.city}
                    </p>
                    <p className="mt-1.5 text-muted-foreground tabular-nums">
                      {formatNumber(selected.subject_property.area)} m², {selected.subject_property.bedrooms} quartos,{" "}
                      {selected.subject_property.bathrooms} banheiros, {selected.subject_property.garage_spaces} vagas
                    </p>
                  </div>
                  <div className="rounded-xl border border-transparent bg-muted p-5 text-sm">
                    <p className="flex items-center gap-2 text-[0.8125rem] leading-4 font-semibold text-subtle">
                      <Users className="size-4" />
                      Amostra
                    </p>
                    <p className="mt-3 text-[0.9375rem] leading-5 font-medium text-foreground tabular-nums">{sampleLabel}</p>
                    {selectedRange && <p className="mt-1.5 text-muted-foreground">{selected.calculation_summary}</p>}
                  </div>
                </div>

                {selected.can_download_report && canView && (
                  <div className="mt-auto flex flex-wrap justify-end gap-2 border-t pt-5">
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


          <Card className="gap-0 overflow-hidden py-0 xl:col-span-4">
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
              <div className="flex items-center gap-2 px-6 py-6 text-sm text-muted-foreground sm:px-8">
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
              <ul className="divide-y border-t">
                {valuations.map((valuation) => {
                  const isSelected = selected?.id === valuation.id;

                  return (
                    <li
                      className={cn(
                        "flex items-center gap-4 px-6 py-3 transition-colors sm:px-8",
                        isSelected && "bg-primary/5 shadow-[inset_3px_0_0_var(--primary)]",
                      )}
                      key={valuation.id}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground tabular-nums">{valuation.code}</p>
                          <Badge variant={valuationStatusBadgeVariant(valuation.status)}>
                            {valuation.status_label}
                          </Badge>
                        </div>
                        <p className="truncate text-[0.8125rem] text-subtle">
                          {valuation.subject_property.neighborhood}, {valuation.subject_property.city}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                        {valuation.final_range?.display.central ?? "-"}
                      </p>
                      <Button
                        onClick={() => void handleSelect(valuation.id)}
                        size="sm"
                        type="button"
                        variant={isSelected ? "secondary" : "outline"}
                      >
                        Abrir
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {canView && (
              <div className="mt-auto">
              <PaginationFooter
                onPageChange={(page) => void loadHistory(page)}
                page={historyPage.page}
                pageCount={historyPage.pageCount}
                pageSize={DEFAULT_PAGE_SIZE}
                total={historyPage.total}
              />
              </div>
            )}
          </Card>
      </div>

      {selected && <ComparableTable comparables={selectedComparables} key={selected.id} />}
    </div>
  );
}

const rangeTileTones = {
  primary: "bg-primary/15 text-primary",
  success: "bg-success/15 text-success",
  info: "bg-info/15 text-info",
} as const;

const rangeValueTones: Record<keyof typeof rangeTileTones, string> = {
  primary: "text-foreground",
  success: "text-success",
  info: "text-info",
};

/** Market range drawn as a bar from the minimum to the maximum, with the central value marked. */
function RangeBar({ range }: { range: ValuationRange }) {
  const span = range.max - range.min;
  const centralShare = span > 0 ? Math.min(Math.max((range.central - range.min) / span, 0), 1) : 0.5;

  return (
    <div aria-hidden="true" className="mt-6">
      <div className="relative h-2.5 rounded-full bg-gradient-to-r from-info via-primary to-success">
        <span
          className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-card bg-foreground"
          style={{ left: `${centralShare * 100}%` }}
        />
      </div>
      <div className="relative mt-2.5 flex h-4 justify-between text-[0.8125rem] leading-4 text-subtle">
        <span>Mínimo</span>
        {/* Kept clear of the end labels so they never overlap. */}
        <span
          className="absolute -translate-x-1/2 font-semibold text-foreground"
          style={{ left: `${Math.min(Math.max(centralShare, 0.18), 0.82) * 100}%` }}
        >
          Central
        </span>
        <span>Máximo</span>
      </div>
    </div>
  );
}

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
    <div className="rounded-xl border border-transparent bg-muted p-5">
      <p className="text-[0.8125rem] leading-4 font-semibold text-subtle">{label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className={`flex shrink-0 items-center justify-center rounded-xl p-[9px] ${rangeTileTones[tone]}`}>
          <Icon className="size-5" />
        </span>
        <p className={`text-2xl leading-8 font-semibold tracking-[-0.01em] tabular-nums ${rangeValueTones[tone]}`}>{value}</p>
      </div>
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

      <div className="flex flex-wrap items-center gap-2 px-6 pb-5 sm:px-8 sm:pb-6">
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-6 py-4 sm:px-8">
        <p className="text-sm text-subtle">
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
