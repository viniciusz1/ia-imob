"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Filter, MapPin, RotateCcw, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  decideProspect,
  previewProspectingRequery,
  promoteProspect,
  queueProspectingGroup,
  queueProspectingOperation,
  type ProspectingRequeryPreview,
} from "@/services/crawlerService";
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
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const [cityFilter, setCityFilter] = useState("");
  const [operationFilter, setOperationFilter] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [batchReason, setBatchReason] = useState("");
  const [isDeciding, setIsDeciding] = useState(false);
  const filtered = useMemo(
    () => filteredProspects(prospects, reviewFilter, classificationFilter, cityFilter, operationFilter),
    [cityFilter, classificationFilter, operationFilter, prospects, reviewFilter],
  );
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

  const canQueue = prospectingMode === "batch"
    ? Boolean(batchCities.trim())
    : Boolean(city.trim() && state.trim().length === 2);

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
      const updated = await decideProspect(prospect.id, decision, reasons[prospect.id] ?? "");
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
    router.push(`/admin/crawler/agencies/${result.crawl_agency.id}`);
  };

  return (
    <section className="space-y-6 pb-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Prospecção</h2>
        <p className="mt-1 text-sm text-muted-foreground">Encontre imobiliárias por cidade, revise os resultados e encaminhe os aprovados para onboarding.</p>
      </div>

      <Card className="scroll-mt-16" id="nova-prospeccao">
        <CardHeader className="border-b">
          <CardTitle>Nova prospecção</CardTitle>
          <CardDescription>Escolha uma cidade ou envie uma lista para iniciar a busca.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div aria-label="Modo de prospecção" className="inline-flex rounded-lg bg-muted p-1" role="group">
            <Button aria-pressed={prospectingMode === "single"} onClick={() => changeProspectingMode("single")} size="sm" type="button" variant={prospectingMode === "single" ? "secondary" : "ghost"}>
              Uma cidade
            </Button>
            <Button aria-pressed={prospectingMode === "batch"} onClick={() => changeProspectingMode("batch")} size="sm" type="button" variant={prospectingMode === "batch" ? "secondary" : "ghost"}>
              Várias cidades
            </Button>
          </div>

          {prospectingMode === "single" ? (
            <div className="grid max-w-2xl gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <div className="space-y-2">
                <Label htmlFor="prospect-city">Cidade</Label>
                <Input autoComplete="address-level2" id="prospect-city" onChange={(event) => setCity(event.target.value)} placeholder="Ex.: Jaraguá do Sul" value={city} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prospect-state">UF</Label>
                <Input autoComplete="address-level1" className="uppercase" id="prospect-state" maxLength={2} onChange={(event) => setState(event.target.value)} placeholder="SC" value={state} />
              </div>
            </div>
          ) : (
            <div className="max-w-2xl space-y-2">
              <Label htmlFor="prospect-batch">Lista de cidades</Label>
              <Textarea className="min-h-32 font-mono text-sm" id="prospect-batch" onChange={(event) => setBatchCities(event.target.value)} placeholder={"Jaraguá do Sul, SC\nJoinville, SC\nCuritiba, PR"} value={batchCities} />
              <p className="text-xs text-muted-foreground">Informe uma cidade e a UF por linha, separadas por vírgula.</p>
            </div>
          )}

          <div className="flex flex-col gap-4 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={requeryKnown} id="requery-known" onCheckedChange={(checked) => { setRequeryKnown(checked === true); setRequeryPreview(null); setRequeryConfirmed(false); }} />
                <Label className="font-normal" htmlFor="requery-known">Incluir domínios já conhecidos</Label>
              </div>
              {requeryKnown && (
                <div className="flex flex-wrap items-center gap-3 pl-6">
                  <Button disabled={!canQueue} onClick={() => void previewProspectingRequery(cities()).then(setRequeryPreview)} size="sm" type="button" variant="outline">
                    Calcular impacto
                  </Button>
                  {requeryPreview && (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{requeryPreview.total} domínio(s) será(ão) consultado(s) novamente.</span>
                      <div className="flex items-center gap-2">
                        <Checkbox checked={requeryConfirmed} id="confirm-requery" onCheckedChange={(checked) => setRequeryConfirmed(checked === true)} />
                        <Label className="font-normal" htmlFor="confirm-requery">Confirmar reconsulta</Label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <Button className="w-full lg:w-auto" disabled={!canQueue || (requeryKnown && (!requeryPreview || !requeryConfirmed))} onClick={() => void queue()}>
              <Search />
              {prospectingMode === "single" ? "Prospectar cidade" : "Prospectar cidades"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Revisão de prospecções</CardTitle>
          <CardDescription>Analise as evidências e aprove apenas os prospects que devem seguir para onboarding.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium"><Filter className="size-4" />Filtros</div>
              {filtersActive && <Button onClick={clearFilters} size="sm" type="button" variant="ghost"><RotateCcw />Limpar</Button>}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(12rem,1.2fr)_minmax(10rem,0.8fr)_minmax(11rem,0.8fr)_minmax(14rem,1fr)]">
              <div className="space-y-2"><Label htmlFor="city-filter">Filtrar por cidade</Label><Input id="city-filter" onChange={(event) => setCityFilter(event.target.value)} placeholder="Buscar por cidade" value={cityFilter} /></div>
              <div className="space-y-2"><Label htmlFor="operation-filter">Filtrar por operação</Label><Input id="operation-filter" onChange={(event) => setOperationFilter(event.target.value)} placeholder="ID da operação" type="number" value={operationFilter} /></div>
              <div className="space-y-2"><Label htmlFor="review-filter">Revisão</Label><select aria-label="Filtrar revisão" className="h-9 w-full rounded-md border bg-background px-3 text-sm" id="review-filter" onChange={(event) => setReviewFilter(event.target.value)} value={reviewFilter}><option value="">Todas</option><option value="pending">Pendentes</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option></select></div>
              <div className="space-y-2"><Label htmlFor="classification-filter">Classificação automática</Label><select aria-label="Filtrar classificação" className="h-9 w-full rounded-md border bg-background px-3 text-sm" id="classification-filter" onChange={(event) => setClassificationFilter(event.target.value)} value={classificationFilter}><option value="">Todas</option><option value="candidate">Candidatos</option><option value="rejected">Rejeitados automaticamente</option></select></div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{filtered.length} de {prospects.length} prospect(s) exibido(s)</p>
          </div>

          <div className="rounded-lg border p-4">
            <div className="mb-3">
              <p className="text-sm font-medium">Decisão em lote</p>
              <p className="text-xs text-muted-foreground">{selectedPendingCount ? `${selectedPendingCount} prospect(s) pendente(s) selecionado(s).` : "Selecione prospects pendentes na tabela para usar esta ação."}</p>
            </div>
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <div className="min-w-64 flex-1 space-y-2"><Label htmlFor="batch-prospect-reason">Motivo da decisão</Label><Input disabled={!selectedPendingCount} id="batch-prospect-reason" onChange={(event) => setBatchReason(event.target.value)} placeholder="Ex.: sites revisados manualmente" value={batchReason} /></div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button disabled={!selectedPendingCount || !batchReason.trim() || isDeciding} onClick={() => void decideSelected("approved")}><Check />Aprovar selecionados ({selectedPendingCount})</Button>
                <Button disabled={!selectedPendingCount || !batchReason.trim() || isDeciding} onClick={() => void decideSelected("rejected")} variant="outline"><X />Rejeitar selecionados</Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-12 pl-4"><Checkbox aria-label="Selecionar todas as pendentes" checked={pendingProspects.length > 0 && pendingProspects.every((prospect) => selected.includes(prospect.id))} onCheckedChange={(checked) => setSelected(checked === true ? pendingProspects.map((prospect) => prospect.id) : [])} /></TableHead>
                  <TableHead>Prospect</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Revisão</TableHead>
                  <TableHead className="min-w-80">Próxima ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((prospect) => (
                  <TableRow data-state={selected.includes(prospect.id) ? "selected" : undefined} key={prospect.id}>
                    <TableCell className="pl-4"><Checkbox aria-label={`Selecionar ${prospect.name}`} checked={selected.includes(prospect.id)} disabled={prospect.review_state !== "pending"} onCheckedChange={(checked) => setSelected((current) => checked === true ? [...current, prospect.id] : current.filter((id) => id !== prospect.id))} /></TableCell>
                    <TableCell>
                      <p className="font-medium">{prospect.name}</p>
                      <p className="max-w-64 truncate text-xs text-muted-foreground">{prospect.root_domain ?? "Sem domínio informado"}</p>
                      {prospect.automatic_reason && <p className="mt-1 max-w-64 truncate text-xs text-amber-700">{prospect.automatic_reason}</p>}
                    </TableCell>
                    <TableCell><span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-muted-foreground" />{prospect.city}, {prospect.state}</span></TableCell>
                    <TableCell><Badge variant={prospect.automatic_classification === "candidate" ? "secondary" : "outline"}>{classificationLabels[prospect.automatic_classification]}</Badge></TableCell>
                    <TableCell><ReviewBadge state={prospect.review_state} /></TableCell>
                    <TableCell>
                      {prospect.review_state === "pending" && (
                        <div className="flex min-w-80 flex-wrap gap-2">
                          <Input aria-label={`Motivo para ${prospect.name}`} className="min-w-44 flex-1" onChange={(event) => setReasons((current) => ({ ...current, [prospect.id]: event.target.value }))} placeholder="Informe o motivo" value={reasons[prospect.id] ?? ""} />
                          <Button aria-label={`Aprovar ${prospect.name}`} disabled={!(reasons[prospect.id] ?? "").trim()} onClick={() => void decide(prospect, "approved")} size="sm"><Check />Aprovar</Button>
                          <Button aria-label={`Rejeitar ${prospect.name}`} disabled={!(reasons[prospect.id] ?? "").trim()} onClick={() => void decide(prospect, "rejected")} size="sm" variant="outline"><X />Rejeitar</Button>
                        </div>
                      )}
                      {prospect.review_state !== "pending" && (
                        <div className="flex items-center justify-between gap-4">
                          <p className="max-w-52 truncate text-sm text-muted-foreground" title={prospect.review_reason ?? undefined}>{prospect.review_reason || "Sem motivo registrado"}</p>
                          {prospect.review_state === "approved" && !prospect.promoted_crawl_agency_id && <Button onClick={() => void promote(prospect)} size="sm" variant="secondary">Iniciar onboarding</Button>}
                          {prospect.promoted_crawl_agency_id && <Button asChild size="sm" variant="outline"><Link href={`/admin/crawler/agencies/${prospect.promoted_crawl_agency_id}`}>Ver onboarding</Link></Button>}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell className="h-32 text-center text-muted-foreground" colSpan={6}>Nenhum prospect corresponde aos filtros.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {initialSuggestions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Sugestões para Crawl Agencies existentes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Somente sugestões; cadastro, lifecycle, perfil e agendamento não são alterados automaticamente.</p>
            {initialSuggestions.map((suggestion) => <div className="rounded-md border p-3" key={suggestion.id}><Link className="underline" href={`/admin/crawler/agencies/${suggestion.crawl_agency_id}`}>Crawl Agency #{suggestion.crawl_agency_id}</Link><pre className="whitespace-pre-wrap text-xs">{JSON.stringify(suggestion.differences, null, 2)}</pre></div>)}
          </CardContent>
        </Card>
      )}
    </section>
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
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200" variant="outline"><Check />{reviewLabels[state]}</Badge>;
  }

  if (state === "rejected") {
    return <Badge variant="destructive"><X />{reviewLabels[state]}</Badge>;
  }

  return <Badge variant="outline">{reviewLabels[state]}</Badge>;
}
