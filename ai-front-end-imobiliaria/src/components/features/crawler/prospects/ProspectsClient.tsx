"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Filter, MapPin, RotateCcw, Search, Trash2, X } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { Badge } from "@/components/ui/badge";
import {
  MissingFieldsHint,
  missingFields,
  stateError,
  textError,
  useTouchedFields,
} from "@/components/features/crawler/requiredFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useClientPagination } from "@/hooks/useClientPagination";
import {
  decideProspect,
  previewProspectingRequery,
  promoteProspect,
  queueProspectingGroup,
  queueProspectingOperation,
  type ProspectingRequeryPreview,
} from "@/services/crawlerService";
import { cn } from "@/lib/utils";
import type { CrawlAgencySuggestion, Prospect } from "@/types/crawler";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

const classificationLabels: Record<Prospect["automatic_classification"], string> = {
  candidate: "Candidato",
  rejected: "Rejeitado automaticamente",
};

const reviewLabels: Record<Prospect["review_state"], string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

export function ProspectsClient({ initialProspects, initialSuggestions = [] }: { initialProspects: Prospect[]; initialSuggestions?: CrawlAgencySuggestion[] }) {
  const router = useRouter();
  const [prospects, setProspects] = useState(initialProspects);
  const [prospectingMode, setProspectingMode] = useState<"single" | "batch">("single");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [batchCities, setBatchCities] = useState("");
  const [requeryKnown, setRequeryKnown] = useState(false);
  const [requeryPreview, setRequeryPreview] = useState<ProspectingRequeryPreview | null>(null);
  const [requeryConfirmed, setRequeryConfirmed] = useState(false);
  const [reviewFilter, setReviewFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [operationFilter, setOperationFilter] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [batchReason, setBatchReason] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);
  const filtered = useMemo(
    () => filteredProspects(prospects, reviewFilter, classificationFilter, cityFilter, operationFilter),
    [cityFilter, classificationFilter, operationFilter, prospects, reviewFilter],
  );
  const pagination = useClientPagination(filtered);
  const pendingProspects = filtered.filter((prospect) => prospect.review_state === "pending");
  const filtersActive = Boolean(cityFilter || operationFilter || reviewFilter || classificationFilter);
  const selectedPendingCount = pendingProspects.filter((prospect) => selected.includes(prospect.id)).length;

  function clearFilters() {
    setCityFilter("");
    setOperationFilter("");
    setReviewFilter("");
    setClassificationFilter("");
  }

  function changeProspectingMode(mode: "single" | "batch") {
    setProspectingMode(mode);
    setRequeryPreview(null);
    setRequeryConfirmed(false);
  }

  const cities = () => {
    if (prospectingMode === "single") {
      return [{ city: city.trim(), state: state.trim().toUpperCase() }];
    }

    return batchCities
      .split("\n")
      .map((line) => line.split(",").map((part) => part.trim()))
      .filter((parts) => parts.length === 2 && parts[0] && parts[1])
      .map(([batchCity, batchState]) => ({ city: batchCity, state: batchState.toUpperCase() }));
  };

  // Same limits as the API (ProspectingCitiesRequest): city up to 120
  // characters, a real 2-letter UF, at most 50 cities per batch.
  const { touch, shown } = useTouchedFields();
  const cityError = textError(city, { max: 120 });
  const stateFieldError = stateError(state);
  const batchLines = batchCities.split("\n").map((line) => line.trim()).filter(Boolean);
  const invalidBatchLines = batchLines
    .map((line, index) => {
      const parts = line.split(",").map((part) => part.trim());
      const valid = parts.length === 2 && textError(parts[0], { max: 120 }) === null && stateError(parts[1]) === null;
      return valid ? null : index + 1;
    })
    .filter((line): line is number => line !== null);
  const batchError =
    batchLines.length === 0
      ? "Informe ao menos uma linha no formato \"Cidade, UF\"."
      : invalidBatchLines.length > 0
        ? `Use "Cidade, UF" com uma UF válida — confira a(s) linha(s) ${invalidBatchLines.join(", ")}.`
        : batchLines.length > 50
          ? "Informe no máximo 50 cidades por vez."
          : null;
  const prospectingMissing = prospectingMode === "batch"
    ? missingFields([["lista de cidades válida", batchError === null]])
    : missingFields([
      ["Cidade", cityError === null],
      ["UF válida", stateFieldError === null],
    ]);
  const batchReasonError = textError(batchReason, { max: 2000 });
  const canQueue = prospectingMissing.length === 0;
  const requeryPending = requeryKnown && (!requeryPreview || !requeryConfirmed);

  const queue = async () => {
    const targets = cities();
    if (targets.length === 1 && !requeryKnown) {
      const operation = await queueProspectingOperation(targets[0].city, targets[0].state);
      toast.success(`Prospecção #${operation.id} enfileirada.`);
      return;
    }
    const group = await queueProspectingGroup({
      name: `Prospecção de ${targets.length} cidades`,
      cities: targets,
      requery_known_domains: requeryKnown,
      confirmed_known_domain_count: requeryKnown ? requeryPreview?.total : undefined,
    });
    toast.success(`Grupo #${group.id} com ${group.member_count} cidades enfileirado.`);
  };
  const decide = async (prospect: Prospect, decision: "approved" | "rejected") => {
    try {
      const updated = await decideProspect(prospect.id, decision, decision === "approved" ? "Aprovado manualmente" : "Rejeitado manualmente");
      setProspects((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast.success(`Prospect ${decision === "approved" ? "aprovado" : "rejeitado"}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível registrar a decisão."));
    }
  };
  const decideSelected = async (decision: "approved" | "rejected") => {
    const targets = filtered.filter((prospect) => selected.includes(prospect.id) && prospect.review_state === "pending");
    if (targets.length === 0 || !batchReason.trim()) return;
    setIsDeciding(true);
    try {
      const updated = await Promise.all(targets.map((prospect) => decideProspect(prospect.id, decision, batchReason)));
      setProspects((current) => current.map((prospect) => updated.find((item) => item.id === prospect.id) ?? prospect));
      setSelected([]);
      toast.success(`${updated.length} prospecção(ões) ${decision === "approved" ? "aprovada(s)" : "rejeitada(s)"}.`);
    } catch (error) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível concluir a decisão em lote."));
    } finally {
      setIsDeciding(false);
    }
  };
  const promote = async (prospect: Prospect) => {
    const result = await promoteProspect(prospect.id);
    setProspects((current) => current.map((item) => item.id === prospect.id ? { ...item, promoted_crawl_agency_id: result.crawl_agency.id } : item));
    toast.success("Crawl Agency e Plano de Onboarding em rascunho criados.");
    router.push(`/admin/crawler/agencies/${result.crawl_agency.id}/onboarding?novo=true`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        description="Encontre imobiliárias por cidade, revise os resultados e encaminhe os aprovados para onboarding."
        title="Prospecção"
      />

      <Card className="scroll-mt-6" id="nova-prospeccao">
        <CardHeader>
          <CardTitle>Nova prospecção</CardTitle>
          <CardDescription>Escolha uma cidade ou envie uma lista para iniciar a busca.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div aria-label="Modo de prospecção" className="flex flex-wrap gap-1" role="group">
            <ModeButton active={prospectingMode === "single"} onClick={() => changeProspectingMode("single")}>
              Uma cidade
            </ModeButton>
            <ModeButton active={prospectingMode === "batch"} onClick={() => changeProspectingMode("batch")}>
              Várias cidades
            </ModeButton>
          </div>

          {prospectingMode === "single" ? (
            <div className="grid max-w-2xl gap-5 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <FormField error={shown("city", cityError)} htmlFor="prospect-city" label="Cidade" required>
                <Input
                  autoComplete="address-level2"
                  id="prospect-city"
                  onBlur={() => touch("city")}
                  onChange={(event) => {
                    setCity(event.target.value);
                    touch("city");
                  }}
                  placeholder="Ex.: Jaraguá do Sul"
                  value={city}
                />
              </FormField>
              <FormField error={shown("state", stateFieldError)} htmlFor="prospect-state" label="UF" required>
                <Input
                  autoComplete="address-level1"
                  className="uppercase"
                  id="prospect-state"
                  maxLength={2}
                  onBlur={() => touch("state")}
                  onChange={(event) => {
                    setState(event.target.value);
                    touch("state");
                  }}
                  placeholder="SC"
                  value={state}
                />
              </FormField>
            </div>
          ) : (
            <FormField
              className="max-w-2xl"
              error={shown("batch", batchError)}
              hint="Informe uma cidade e a UF por linha, separadas por vírgula (até 50)."
              htmlFor="prospect-batch"
              label="Lista de cidades"
              required
            >
              <Textarea
                className="min-h-32 font-mono text-sm"
                id="prospect-batch"
                onBlur={() => touch("batch")}
                onChange={(event) => {
                  setBatchCities(event.target.value);
                  touch("batch");
                }}
                placeholder={"Jaraguá do Sul, SC\nJoinville, SC\nCuritiba, PR"}
                value={batchCities}
              />
            </FormField>
          )}

          <div className="flex flex-col gap-4 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={requeryKnown}
                  id="requery-known"
                  onCheckedChange={(checked) => {
                    setRequeryKnown(checked === true);
                    setRequeryPreview(null);
                    setRequeryConfirmed(false);
                  }}
                />
                <Label htmlFor="requery-known">Incluir domínios já conhecidos</Label>
              </div>
              {requeryKnown && (
                <div className="flex flex-wrap items-center gap-3 pl-6">
                  <Button
                    disabled={!canQueue}
                    onClick={() => void previewProspectingRequery(cities()).then(setRequeryPreview)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Calcular impacto
                  </Button>
                  {requeryPreview && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-muted-foreground tabular-nums">
                        {requeryPreview.total} domínio(s) será(ão) consultado(s) novamente.
                      </span>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={requeryConfirmed}
                          id="confirm-requery"
                          onCheckedChange={(checked) => setRequeryConfirmed(checked === true)}
                        />
                        <Label htmlFor="confirm-requery">Confirmar reconsulta</Label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col items-stretch gap-2 lg:items-end">
              <Button
                className="w-full lg:w-auto"
                disabled={!canQueue || requeryPending}
                onClick={() => void queue()}
              >
                <Search />
                {prospectingMode === "single" ? "Prospectar cidade" : "Prospectar cidades"}
              </Button>
              <MissingFieldsHint missing={prospectingMissing} />
              {canQueue && requeryPending && (
                <p className="text-[0.8125rem] text-subtle" role="status">
                  Calcule o impacto e confirme a reconsulta.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden pb-0">
        <CardHeader>
          <CardTitle>Revisão de prospecções</CardTitle>
          <CardDescription>
            Analise as evidências e aprove apenas os prospects que devem seguir para onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-transparent bg-muted p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Filter className="size-4 text-muted-foreground" />
                Filtros
              </div>
              {filtersActive && (
                <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
                  <RotateCcw />
                  Limpar
                </Button>
              )}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(12rem,1.2fr)_minmax(10rem,0.8fr)_minmax(11rem,0.8fr)_minmax(14rem,1fr)]">
              <FormField htmlFor="city-filter" label="Filtrar por cidade">
                <Input
                  size="sm"
                  id="city-filter"
                  onChange={(event) => setCityFilter(event.target.value)}
                  placeholder="Buscar por cidade"
                  value={cityFilter}
                />
              </FormField>
              <FormField htmlFor="operation-filter" label="Filtrar por operação">
                <Input
                  size="sm"
                  id="operation-filter"
                  onChange={(event) => setOperationFilter(event.target.value)}
                  placeholder="ID da operação"
                  type="number"
                  value={operationFilter}
                />
              </FormField>
              <FormField htmlFor="review-filter" label="Revisão">
                <NativeSelect
                  aria-label="Filtrar revisão"
                  id="review-filter"
                  onChange={(event) => setReviewFilter(event.target.value)}
                  size="sm"
                  value={reviewFilter}
                >
                  <option value="">Todas</option>
                  <option value="pending">Pendentes</option>
                  <option value="approved">Aprovados</option>
                  <option value="rejected">Rejeitados</option>
                </NativeSelect>
              </FormField>
              <FormField htmlFor="classification-filter" label="Classificação automática">
                <NativeSelect
                  aria-label="Filtrar classificação"
                  id="classification-filter"
                  onChange={(event) => setClassificationFilter(event.target.value)}
                  size="sm"
                  value={classificationFilter}
                >
                  <option value="">Todas</option>
                  <option value="candidate">Candidatos</option>
                  <option value="rejected">Rejeitados automaticamente</option>
                </NativeSelect>
              </FormField>
            </div>
            <p className="mt-3 text-xs text-muted-foreground tabular-nums">
              {filtered.length} de {prospects.length} prospect(s) exibido(s)
            </p>
          </div>

          <div className="rounded-xl border border-transparent bg-muted p-4">
            <div className="mb-3">
              <p className="text-sm text-foreground">Decisão em lote</p>
              <p className="text-xs text-muted-foreground">
                {selectedPendingCount
                  ? `${selectedPendingCount} prospect(s) pendente(s) selecionado(s).`
                  : "Selecione prospects pendentes na tabela para usar esta ação."}
              </p>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <FormField
                className="min-w-64 flex-1"
                error={selectedPendingCount > 0 ? shown("batchReason", batchReasonError) : null}
                hint={selectedPendingCount > 0 && !batchReason.trim() ? "Preencha: Motivo da decisão" : undefined}
                htmlFor="batch-prospect-reason"
                label="Motivo da decisão"
              >
                <Input
                  disabled={!selectedPendingCount}
                  id="batch-prospect-reason"
                  maxLength={2000}
                  onBlur={() => touch("batchReason")}
                  onChange={(event) => {
                    setBatchReason(event.target.value);
                    touch("batchReason");
                  }}
                  placeholder="Ex.: sites revisados manualmente"
                  value={batchReason}
                />
              </FormField>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  disabled={!selectedPendingCount || batchReasonError !== null || isDeciding}
                  onClick={() => void decideSelected("approved")}
                >
                  <Check />
                  Aprovar selecionados ({selectedPendingCount})
                </Button>
                <Button
                  disabled={!selectedPendingCount || batchReasonError !== null || isDeciding}
                  onClick={() => void decideSelected("rejected")}
                  variant="outline"
                >
                  <X />
                  Rejeitar selecionados
                </Button>
              </div>
            </div>
          </div>
        </CardContent>

        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Selecionar todas as pendentes"
                    checked={pendingProspects.length > 0 && pendingProspects.every((prospect) => selected.includes(prospect.id))}
                    onCheckedChange={(checked) => setSelected(checked === true ? pendingProspects.map((prospect) => prospect.id) : [])}
                  />
                </TableHead>
                <TableHead>Prospect</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Revisão</TableHead>
                <TableHead className="text-right">Próxima ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.map((prospect) => (
                <TableRow data-state={selected.includes(prospect.id) ? "selected" : undefined} key={prospect.id}>
                  <TableCell>
                    <Checkbox
                      aria-label={`Selecionar ${prospect.name}`}
                      checked={selected.includes(prospect.id)}
                      disabled={prospect.review_state !== "pending"}
                      onCheckedChange={(checked) => setSelected((current) => checked === true
                        ? [...current, prospect.id]
                        : current.filter((id) => id !== prospect.id))}
                    />
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground">{prospect.name}</p>
                    <p className="max-w-64 truncate text-xs text-muted-foreground">
                      {prospect.root_domain ?? "Sem domínio informado"}
                    </p>
                    {prospect.automatic_reason && (
                      <p className="mt-1 max-w-64 truncate text-xs text-warning">{prospect.automatic_reason}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-muted-foreground" />
                      {prospect.city}, {prospect.state}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={prospect.automatic_classification === "candidate" ? "info" : "muted"}>
                      {classificationLabels[prospect.automatic_classification]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <ReviewBadge state={prospect.review_state} />
                  </TableCell>
                  <TableCell>
                    {prospect.review_state === "pending" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          aria-label={`Aprovar ${prospect.name}`}
                          onClick={() => void decide(prospect, "approved")}
                          size="icon-sm"
                          title="Aprovar"
                          type="button"
                        >
                          <Check />
                        </Button>
                        <Button
                          aria-label={`Rejeitar ${prospect.name}`}
                          onClick={() => void decide(prospect, "rejected")}
                          size="icon-sm"
                          title="Rejeitar"
                          type="button"
                          variant="outline"
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    )}
                    {prospect.review_state !== "pending" && (
                      <div className="flex items-center justify-between gap-4">
                        <p className="max-w-52 truncate text-sm text-muted-foreground" title={prospect.review_reason ?? undefined}>
                          {prospect.review_reason || "Sem motivo registrado"}
                        </p>
                        {prospect.review_state === "approved" && !prospect.promoted_crawl_agency_id && (
                          <Button onClick={() => void promote(prospect)} size="sm" variant="secondary">
                            Iniciar onboarding
                          </Button>
                        )}
                        {prospect.promoted_crawl_agency_id && (
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/admin/crawler/agencies/${prospect.promoted_crawl_agency_id}/onboarding`}>Ver onboarding</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell className="h-32 text-center text-muted-foreground" colSpan={6}>
                    Nenhum prospect corresponde aos filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <PaginationFooter
          onPageChange={pagination.setPage}
          page={pagination.page}
          pageCount={pagination.pageCount}
          pageSize={pagination.pageSize}
          total={pagination.total}
        />
      </Card>

      {initialSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sugestões para Crawl Agencies existentes</CardTitle>
            <CardDescription>
              Somente sugestões; cadastro, lifecycle, perfil e agendamento não são alterados automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {initialSuggestions.map((suggestion) => (
              <div className="space-y-3 rounded-xl border border-transparent bg-muted p-4" key={suggestion.id}>
                <Link
                  className="text-sm text-primary hover:underline"
                  href={`/admin/crawler/agencies/${suggestion.crawl_agency_id}`}
                >
                  Crawl Agency #{suggestion.crawl_agency_id}
                </Link>
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
                  {JSON.stringify(suggestion.differences, null, 2)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center rounded-lg px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function filteredProspects(prospects: Prospect[], reviewFilter: string, classificationFilter: string, cityFilter: string, operationFilter: string) {
  return prospects.filter((prospect) =>
    (!reviewFilter || prospect.review_state === reviewFilter)
    && (!classificationFilter || prospect.automatic_classification === classificationFilter)
    && (!cityFilter || prospect.city.toLocaleLowerCase("pt-BR").includes(cityFilter.toLocaleLowerCase("pt-BR")))
    && (!operationFilter || prospect.latest_operation_id === Number(operationFilter)),
  );
}

function ReviewBadge({ state }: { state: Prospect["review_state"] }) {
  if (state === "approved") {
    return <Badge variant="success"><Check />{reviewLabels[state]}</Badge>;
  }

  if (state === "rejected") {
    return <Badge variant="destructive"><X />{reviewLabels[state]}</Badge>;
  }

  return <Badge variant="warning">{reviewLabels[state]}</Badge>;
}
