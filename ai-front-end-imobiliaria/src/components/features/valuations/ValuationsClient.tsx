"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Calculator, Check, Download, ExternalLink, FileSpreadsheet, FileText, Loader2, Search, X } from "lucide-react";
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
import { authService } from "@/services/authService";
import { useAuthStore } from "@/store/useAuthStore";
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
    return "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100";
  }

  if (status === "rejected") {
    return "border-red-200 bg-red-50 text-red-700 hover:bg-red-100";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100";
}

function comparableReviewsFrom(candidates: ComparableCandidate[]): ComparableReview[] | null {
  const reviews: ComparableReview[] = [];

  for (const candidate of candidates) {
    if (candidate.review_status === "pending") {
      return null;
    }

    reviews.push({
      scrapy_property_id: candidate.scrapy_property_id,
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
  const [selected, setSelected] = useState<Valuation | null>(null);
  const [candidates, setCandidates] = useState<ComparableCandidate[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(() => new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<DownloadFormat | null>(null);
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

    setIsLoadingCandidates(true);
    try {
      const comparableCandidates = await getValuationCandidates(form);
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

  function markSelectedCandidates(status: ComparableReviewDecision) {
    setCandidates((current) =>
      current.map((candidate) =>
        selectedCandidateIds.has(candidate.scrapy_property_id)
          ? { ...candidate, review_status: status }
          : candidate
      )
    );
    setSelectedCandidateIds(new Set());
  }

  function cycleCandidateStatus(candidateId: number) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.scrapy_property_id === candidateId
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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Avaliar imóvel</h1>
        <p className="text-muted-foreground">
          Calcule uma avaliação de mercado com base em imóveis comparáveis da base.
        </p>
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
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={form.neighborhood}
                  onChange={(event) => setForm((current) => ({ ...current, neighborhood: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo residencial</Label>
                <Select
                  value={form.residential_type}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, residential_type: value as ResidentialType }))
                  }
                >
                  <SelectTrigger>
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

              <Button type="submit" className="w-full" disabled={isLoadingCandidates}>
                {isLoadingCandidates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Buscar comparáveis
              </Button>
            </form>
          </CardContent>
        </Card>}

        <div className="flex flex-col gap-6">
          {canCreate && candidates.length > 0 && (
            <ComparableReviewPanel
              candidates={candidates}
              selectedCandidateIds={selectedCandidateIds}
              pendingCount={pendingCandidates}
              approvedCount={approvedCandidates}
              rejectedCount={rejectedCandidates}
              isSubmitting={isSubmitting}
              canCalculate={canCalculateReviewedValuation}
              onToggleSelected={toggleCandidateSelection}
              onMarkSelected={markSelectedCandidates}
              onCycleStatus={cycleCandidateStatus}
              onCalculate={() => void handleCreateReviewedValuation()}
            />
          )}

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Resultado</CardTitle>
                <CardDescription>
                  {selected ? `${selected.code} - ${selected.status_label}` : "Nenhuma avaliação selecionada"}
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
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-md border p-4">
                        <p className="text-sm text-muted-foreground">Mínimo</p>
                        <p className="text-2xl font-semibold">{selectedRange.display.min}</p>
                      </div>
                      <div className="rounded-md border p-4">
                        <p className="text-sm text-muted-foreground">Central</p>
                        <p className="text-2xl font-semibold">{selectedRange.display.central}</p>
                      </div>
                      <div className="rounded-md border p-4">
                        <p className="text-sm text-muted-foreground">Máximo</p>
                        <p className="text-2xl font-semibold">{selectedRange.display.max}</p>
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

                  <ComparableTable comparables={selectedComparables} />
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
                      <TableHead>Valor central</TableHead>
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
                        <TableCell>{valuation.final_range?.display.central ?? "-"}</TableCell>
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
  candidates: ComparableCandidate[];
  selectedCandidateIds: Set<number>;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  isSubmitting: boolean;
  canCalculate: boolean;
  onToggleSelected: (candidateId: number, checked: boolean) => void;
  onMarkSelected: (status: ComparableReviewDecision) => void;
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
            className="border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => onMarkSelected("rejected")}
            disabled={selectedCount === 0}
          >
            <X className="mr-2 h-4 w-4" />
            Marcar como inválido
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
                <TableHead>Valor</TableHead>
                <TableHead>Valor/m²</TableHead>
                <TableHead>Imóvel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => {
                const agencyLabel = candidate.agency ?? `#${candidate.scrapy_property_id}`;

                return (
                  <TableRow key={candidate.scrapy_property_id}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar comparável ${agencyLabel}`}
                        checked={selectedCandidateIds.has(candidate.scrapy_property_id)}
                        onCheckedChange={(checked) => onToggleSelected(candidate.scrapy_property_id, checked === true)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={reviewStatusClassName(candidate.review_status)}
                        onClick={() => onCycleStatus(candidate.scrapy_property_id)}
                        aria-label={`Status do comparável ${agencyLabel}: ${reviewStatusLabels[candidate.review_status]}`}
                      >
                        {reviewStatusLabels[candidate.review_status]}
                      </Button>
                    </TableCell>
                    <TableCell>{candidate.agency ?? "-"}</TableCell>
                    <TableCell>{candidate.neighborhood}</TableCell>
                    <TableCell>{formatNumber(candidate.area)} m²</TableCell>
                    <TableCell>{formatMoney(candidate.price)}</TableCell>
                    <TableCell>{formatMoney(candidate.price_per_square_meter)}</TableCell>
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

function ComparableTable({ comparables }: { comparables: Valuation["comparable_evidence"] }) {
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
            <TableHead>Valor</TableHead>
            <TableHead>Valor/m²</TableHead>
            <TableHead>Origem</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparables.map((comparable) => (
            <TableRow key={comparable.scrapy_property_id}>
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
              <TableCell>{formatMoney(comparable.price)}</TableCell>
              <TableCell>{formatMoney(comparable.price_per_square_meter)}</TableCell>
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
