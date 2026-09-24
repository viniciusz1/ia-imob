"use client";

import { type ComponentProps, FormEvent, useEffect, useMemo, useState } from "react";
import { Calculator, Check, ChevronDown, Download, ExternalLink, FileSpreadsheet, FileText, Loader2, Plus, Search, X } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { formatValuationMoney as formatMoney, valuationPresentation } from "./valuationPresentation";
import type {
  ComparableCandidate,
  ComparableReview,
  ComparableReviewDecision,
  ComparableReviewStatus,
  ResidentialType,
  Valuation,
  ValuationInput,
  ValuationPurpose,
} from "@/types/valuation";

const residentialTypes: Array<{ value: ResidentialType; label: string }> = [
  { value: "house", label: "Casa" },
  { value: "apartment", label: "Apartamento" },
  { value: "townhouse", label: "Sobrado" },
];

type Finalidade = "venda" | "locacao";
type ValuationForm = Omit<ValuationInput, "purpose" | "city" | "neighborhood"> & {
  finalidade: Finalidade;
  city: string;
  neighborhood: string;
};

const initialInput: ValuationForm = {
  finalidade: "venda",
  city: "",
  neighborhood: "",
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

function LocationSelect({ value, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative w-full min-w-0">
      <select
        {...props}
        value={value}
        className={`peer h-9 w-full min-w-0 cursor-pointer appearance-none truncate rounded-md border border-input bg-background py-1 pl-3 pr-9 text-sm shadow-xs outline-none transition-colors enabled:hover:border-ring/60 enabled:hover:bg-accent/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted/50 disabled:text-muted-foreground dark:[color-scheme:dark] [&>option]:bg-background [&>option]:text-foreground ${value ? "text-foreground" : "text-muted-foreground"}`}
      />
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-40" />
    </div>
  );
}

function nextReviewStatus(status: ComparableReviewStatus): ComparableReviewStatus {
  if (status === "pending") return "approved";
  if (status === "approved") return "rejected";
  return "pending";
}

function reviewStatusClassName(status: ComparableReviewStatus): string {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70";
  }

  return "border-border bg-muted text-muted-foreground hover:bg-muted/70";
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
  const [form, setForm] = useState<ValuationForm>(initialInput);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [selected, setSelected] = useState<Valuation | null>(null);
  const [candidatesInput, setCandidatesInput] = useState<ValuationInput | null>(null);
  const [candidates, setCandidates] = useState<ComparableCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableNeighborhoods, setAvailableNeighborhoods] = useState<string[]>([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);
  const [isLoadingNeighborhoods, setIsLoadingNeighborhoods] = useState(false);
  const permissions = Array.isArray(user?.permissions) ? user.permissions : null;
  const canCreate = permissions?.includes("valuations.create") ?? false;
  const canView = permissions?.includes("valuations.view") ?? false;
  const hasValuationAccess = canCreate || canView;

  const selectedComparables = selected?.comparable_evidence ?? [];
  const selectedRange = selected?.final_range;
  const formPurpose: ValuationPurpose = form.finalidade === "locacao" ? "rent" : "sale";
  const formPresentation = valuationPresentation(formPurpose);
  const resultPresentation = valuationPresentation(selected?.purpose ?? formPurpose);
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
      } catch (error) {
        console.error("Erro ao carregar filtros de localidade", error);
        toast.error("Não foi possível carregar as cidades e bairros disponíveis.");
      } finally {
        setIsLoadingFilters(false);
      }
    }

    void loadFilters();
  }, []);

  useEffect(() => {
    if (!form.city) return;
    let active = true;
    async function loadNeighborhoods() {
      try {
        const filters = await getMarketPropertyFilters(form.city);
        if (active) setAvailableNeighborhoods(filters.bairros);
      } catch (error) {
        if (active) {
          console.error("Erro ao carregar bairros", error);
          toast.error("Não foi possível carregar os bairros desta cidade. Selecione a cidade novamente para tentar.");
        }
      } finally {
        if (active) setIsLoadingNeighborhoods(false);
      }
    }
    void loadNeighborhoods();
    return () => { active = false; };
  }, [form.city]);

  function updateCity(city: string) {
    setForm((current) => ({ ...current, city, neighborhood: "" }));
    setAvailableNeighborhoods([]);
    setIsLoadingNeighborhoods(Boolean(city));
    setCandidates([]);
    setCandidatesInput(null);
    setSelectedCandidateIds(new Set());
  }

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const response = await getValuations();
      setValuations(response.data);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreate) return;

    if (!form.city || !form.neighborhood || isLoadingNeighborhoods || !availableNeighborhoods.includes(form.neighborhood)) {
      toast.error("Selecione uma cidade e um bairro.");
      return;
    }

    setIsLoadingCandidates(true);
    try {
      const { finalidade, city, neighborhood, ...characteristics } = form;
      const input: ValuationInput = {
        ...characteristics,
        city: [city],
        neighborhood: [neighborhood],
        purpose: finalidade === "locacao" ? "rent" : "sale",
      };
      const comparableCandidates = await getValuationCandidates(input);
      setCandidatesInput(input);
      setCandidates(comparableCandidates);
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

    if (!candidatesInput) return;

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
        ...candidatesInput,
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
    setAvailableNeighborhoods([]);
    setIsLoadingNeighborhoods(false);
    setForm(initialInput);
    setCandidatesInput(null);
    setCandidates([]);
    setSelectedCandidateIds(new Set());
    setSelected(null);
  }

  if (isLoadingAccess) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando permissões...
      </div>
    );
  }

  if (!hasValuationAccess) {
    return (
      <div className="mx-auto max-w-3xl rounded-md border p-6">
        <h1 className="text-2xl font-semibold">Acesso indisponível</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Você não tem permissão para avaliar imóveis ou consultar avaliações.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{formPresentation.title}</h1>
          <p className="text-muted-foreground">
            {formPresentation.description}
          </p>
        </div>
        {canCreate && (
          <Button
            type="button"
            variant="outline"
            onClick={handleNewValuation}
            className="mt-1 shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova avaliação
          </Button>
        )}
      </div>

      <div className={canCreate ? "grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]" : "grid gap-6"}>
        {canCreate && <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Imóvel avaliado
            </CardTitle>
            <CardDescription>
              Informe as características usadas para buscar comparáveis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label id="valuation-purpose-label">Finalidade</Label>
                <ToggleGroup
                  role="radiogroup"
                  aria-labelledby="valuation-purpose-label"
                  value={form.finalidade}
                  className="w-full rounded-lg p-1"
                  onValueChange={(finalidade) => {
                    if (finalidade !== "venda" && finalidade !== "locacao") return;
                    if (finalidade === form.finalidade) return;
                    setForm((current) => ({ ...current, finalidade }));
                    setCandidates([]);
                    setCandidatesInput(null);
                    setSelectedCandidateIds(new Set());
                  }}
                >
                  <ToggleGroupItem value="venda" className="h-9 flex-1 rounded-md" disabled={isLoadingCandidates || isSubmitting}>
                    Venda
                  </ToggleGroupItem>
                  <ToggleGroupItem value="locacao" className="h-9 flex-1 rounded-md" disabled={isLoadingCandidates || isSubmitting}>
                    Locação
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-xs text-muted-foreground">{formPresentation.hint}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <LocationSelect
                  id="city"
                  value={form.city}
                  onChange={(event) => updateCity(event.target.value)}
                  disabled={isLoadingFilters}
                  required
                >
                  <option value="">Selecione uma cidade</option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </LocationSelect>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <LocationSelect
                  id="neighborhood"
                  value={form.neighborhood}
                  onChange={(event) => {
                    const neighborhood = event.target.value;
                    if (form.city && !isLoadingNeighborhoods && availableNeighborhoods.includes(neighborhood)) {
                      setForm((current) => ({ ...current, neighborhood }));
                    }
                  }}
                  disabled={!form.city || isLoadingNeighborhoods || availableNeighborhoods.length === 0}
                  required
                >
                  <option value="" disabled>
                    {!form.city ? "Selecione primeiro uma cidade" : isLoadingNeighborhoods ? "Carregando bairros..." : availableNeighborhoods.length === 0 ? "Nenhum bairro disponível" : "Selecione um bairro"}
                  </option>
                  {availableNeighborhoods.map((neighborhood) => (
                    <option key={neighborhood} value={neighborhood}>
                      {neighborhood}
                    </option>
                  ))}
                </LocationSelect>
              </div>

              <div className="space-y-2">
                <Label>Tipo residencial</Label>
                <Select
                  value={form.residential_type}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, residential_type: value as ResidentialType }))
                  }
                >
                  <SelectTrigger className="w-full">
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="area">Metragem</Label>
                  <Input
                    id="area"
                    type="number"
                    min={20}
                    max={2000}
                    value={form.area}
                    onChange={(event) => updateNumber("area", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Quartos</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    min={0}
                    max={10}
                    value={form.bedrooms}
                    onChange={(event) => updateNumber("bedrooms", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Banheiros</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    min={0}
                    max={10}
                    value={form.bathrooms}
                    onChange={(event) => updateNumber("bathrooms", event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="garage_spaces">Vagas</Label>
                  <Input
                    id="garage_spaces"
                    type="number"
                    min={0}
                    max={10}
                    value={form.garage_spaces}
                    onChange={(event) => updateNumber("garage_spaces", event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <Label htmlFor="flood_risk">Risco de enchente</Label>
                <Switch
                  id="flood_risk"
                  checked={form.flood_risk}
                  onCheckedChange={(checked) => setForm((current) => ({ ...current, flood_risk: checked }))}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoadingCandidates || isLoadingFilters}>
                {isLoadingCandidates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar comparáveis
              </Button>
            </form>
          </CardContent>
        </Card>}

        <div className="flex min-w-0 flex-col gap-6">
          {canCreate && candidates.length > 0 && (
            <ComparableReviewPanel
              purpose={candidatesInput?.purpose ?? formPurpose}
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

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{resultPresentation.estimatedValue}</CardTitle>
                <CardDescription>
                  {selected ? `${selected.code} - ${selected.purpose_label} - ${selected.status_label}` : "Nenhuma avaliação selecionada"}
                </CardDescription>
              </div>
              {selected && (
                <Badge variant={selected.status === "calculated" ? "default" : "secondary"}>
                  {selected.status_label}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-5">
              {!selected ? (
                <p className="text-sm text-muted-foreground">
                  Crie uma avaliação ou selecione um registro do histórico.
                </p>
              ) : (
                <>
                  {selectedRange ? (
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-3">
                      <div className="min-w-0 rounded-md border p-4">
                        <p className="text-sm text-muted-foreground">Mínimo</p>
                        <p className="text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">{formatMoney(selectedRange.min, selected.purpose)}</p>
                      </div>
                      <div className="min-w-0 rounded-md border p-4">
                        <p className="text-sm text-muted-foreground">Central</p>
                        <p className="text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">{formatMoney(selectedRange.central, selected.purpose)}</p>
                      </div>
                      <div className="min-w-0 rounded-md border p-4">
                        <p className="text-sm text-muted-foreground">Máximo</p>
                        <p className="text-xl font-semibold tabular-nums [overflow-wrap:anywhere]">{formatMoney(selectedRange.max, selected.purpose)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed p-4">
                      <p className="font-medium">Amostra insuficiente</p>
                      <p className="text-sm text-muted-foreground">{selected.calculation_summary}</p>
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border p-4 text-sm">
                      <p className="font-medium">Imóvel avaliado</p>
                      <p className="text-muted-foreground">
                        {selected.subject_property.residential_type_label} em {selected.subject_property.neighborhood},{" "}
                        {selected.subject_property.city}
                      </p>
                      <p className="text-muted-foreground">
                        {formatNumber(selected.subject_property.area)} m², {selected.subject_property.bedrooms} quartos,{" "}
                        {selected.subject_property.bathrooms} banheiros, {selected.subject_property.garage_spaces} vagas
                      </p>
                    </div>
                    <div className="rounded-md border p-4 text-sm">
                      <p className="font-medium">Amostra</p>
                      <p className="text-muted-foreground">{sampleLabel}</p>
                      <p className="text-muted-foreground">{selected.calculation_summary}</p>
                    </div>
                  </div>

                  {selected.flood_adjustment_percent !== null && (
                    <div className="rounded-md border p-4 text-sm">
                      Ajuste aplicado: -{selected.flood_adjustment_percent}% por risco de enchente informado.
                    </div>
                  )}

                  {selected.can_download_report && canView && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => void handleDownload("pdf")}
                        disabled={downloadingFormat === "pdf"}
                      >
                        {downloadingFormat === "pdf" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Baixar PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDownload("word")}
                        disabled={downloadingFormat === "word"}
                      >
                        {downloadingFormat === "word" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Baixar Word
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void handleDownload("excel")}
                        disabled={downloadingFormat === "excel"}
                      >
                        {downloadingFormat === "excel" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                        Exportar Excel
                      </Button>
                    </div>
                  )}

                  <ComparableTable comparables={selectedComparables} purpose={selected.purpose} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Histórico
              </CardTitle>
              <CardDescription>Avaliações salvas da imobiliária.</CardDescription>
            </CardHeader>
            <CardContent>
              {!canView ? (
                <p className="text-sm text-muted-foreground">Você pode criar avaliações, mas não tem permissão para consultar o histórico.</p>
              ) : isLoadingHistory ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando avaliações...
                </div>
              ) : valuations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma avaliação salva.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Imóvel</TableHead>
                      <TableHead>Finalidade</TableHead>
                      <TableHead>Valor estimado</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {valuations.map((valuation) => (
                      <TableRow key={valuation.id}>
                        <TableCell>{valuation.code}</TableCell>
                        <TableCell>{valuation.status_label}</TableCell>
                        <TableCell>
                          {valuation.subject_property.neighborhood}, {valuation.subject_property.city}
                        </TableCell>
                        <TableCell>{valuation.purpose_label}</TableCell>
                        <TableCell>{valuation.final_range ? formatMoney(valuation.final_range.central, valuation.purpose) : "-"}</TableCell>
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" onClick={() => void handleSelect(valuation.id)}>
                            Abrir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

interface ComparableReviewPanelProps {
  purpose: ValuationPurpose;
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
  purpose,
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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Revisão de comparáveis</CardTitle>
          <CardDescription>
            {candidates.length} candidatos encontrados. Resolva todos os pendentes antes de calcular.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className={reviewStatusClassName("pending")}>
            {pendingCount} pendentes
          </Badge>
          <Badge variant="outline" className={reviewStatusClassName("approved")}>
            {approvedCount} válidos
          </Badge>
          <Badge variant="outline" className={reviewStatusClassName("rejected")}>
            {rejectedCount} inválidos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onMarkSelected("approved")}
            disabled={selectedCount === 0}
          >
            <Check className="mr-2 h-4 w-4" />
            Marcar como válido
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
            onClick={() => onMarkSelected("rejected")}
            disabled={selectedCount === 0}
          >
            <X className="mr-2 h-4 w-4" />
            Marcar como inválido
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={candidates.length === 0}
          >
            Selecionar todos
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={selectedCount === 0}
          >
            Limpar seleção
          </Button>
          <span className="text-sm text-muted-foreground">
            {selectedCount} selecionados
          </span>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Bairro</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>{valuationPresentation(purpose).price}</TableHead>
                <TableHead>{valuationPresentation(purpose).pricePerArea}</TableHead>
                <TableHead>Imóvel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => {
                const agencyLabel = candidate.agency ?? `#${candidate.market_property_id}`;

                return (
                  <TableRow key={candidate.market_property_id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar comparável ${agencyLabel}`}
                        checked={selectedCandidateIds.has(candidate.market_property_id)}
                        onCheckedChange={(checked) => onToggleSelected(candidate.market_property_id, checked === true)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={reviewStatusClassName(candidate.review_status)}
                        onClick={() => onCycleStatus(candidate.market_property_id)}
                        aria-label={`Status do comparável ${agencyLabel}: ${reviewStatusLabels[candidate.review_status]}`}
                      >
                        {reviewStatusLabels[candidate.review_status]}
                      </Button>
                    </TableCell>
                    <TableCell>{candidate.agency ?? "-"}</TableCell>
                    <TableCell>{candidate.neighborhood}</TableCell>
                    <TableCell>{formatNumber(candidate.area)} m²</TableCell>
                    <TableCell>{formatMoney(candidate.price, candidate.purpose ?? purpose)}</TableCell>
                    <TableCell>{formatMoney(candidate.price_per_square_meter, candidate.purpose ?? purpose)}</TableCell>
                    <TableCell>
                      {candidate.link ? (
                        <a
                          className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                          href={candidate.link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Visualizar imóvel
                          <ExternalLink className="h-3.5 w-3.5" />
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
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={onCalculate} disabled={!canCalculate || isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
            Calcular avaliação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparableTable({ comparables, purpose }: { comparables: Valuation["comparable_evidence"]; purpose: ValuationPurpose }) {
  if (comparables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">Evidências comparáveis</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Bairro</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>{valuationPresentation(purpose).price}</TableHead>
            <TableHead>{valuationPresentation(purpose).pricePerArea}</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparables.map((comparable) => (
            <TableRow key={comparable.market_property_id}>
              <TableCell>
                {comparable.review_status ? (
                  <Badge variant="outline" className={reviewStatusClassName(comparable.review_status)}>
                    {reviewStatusLabels[comparable.review_status]}
                  </Badge>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>{comparable.neighborhood}</TableCell>
              <TableCell>{formatNumber(comparable.area)} m²</TableCell>
              <TableCell>{formatMoney(comparable.price, comparable.purpose ?? purpose)}</TableCell>
              <TableCell>{formatMoney(comparable.price_per_square_meter, comparable.purpose ?? purpose)}</TableCell>
              <TableCell>
                {comparable.link ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">{comparable.agency ?? "Origem externa"}</span>
                    <a
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
                      href={comparable.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Visualizar imóvel
                      <ExternalLink className="h-3.5 w-3.5" />
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
    </div>
  );
}
