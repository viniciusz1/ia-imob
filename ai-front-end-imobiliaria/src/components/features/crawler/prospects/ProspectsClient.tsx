"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  decideProspect,
  previewProspectingRequery,
  promoteProspect,
  queueProspectingGroup,
  queueProspectingOperation,
  type ProspectingRequeryPreview,
} from "@/services/crawlerService";
import type { CrawlAgencySuggestion, Prospect } from "@/types/crawler";

export function ProspectsClient({ initialProspects, initialSuggestions = [] }: { initialProspects: Prospect[]; initialSuggestions?: CrawlAgencySuggestion[] }) {
  const [prospects, setProspects] = useState(initialProspects);
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
  const filtered = useMemo(() => prospects.filter((prospect) =>
    (!reviewFilter || prospect.review_state === reviewFilter)
    && (!classificationFilter || prospect.automatic_classification === classificationFilter)
    && (!cityFilter || prospect.city.toLocaleLowerCase("pt-BR").includes(cityFilter.toLocaleLowerCase("pt-BR")))
    && (!operationFilter || prospect.latest_operation_id === Number(operationFilter)),
  ), [cityFilter, classificationFilter, operationFilter, prospects, reviewFilter]);

  const cities = () => {
    const parsed = batchCities.split("\n").map((line) => line.split(",").map((part) => part.trim())).filter((parts) => parts.length === 2 && parts[0] && parts[1]).map(([batchCity, batchState]) => ({ city: batchCity, state: batchState.toUpperCase() }));
    return parsed.length > 0 ? parsed : [{ city: city.trim(), state: state.trim().toUpperCase() }];
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
    const updated = await decideProspect(prospect.id, decision, reasons[prospect.id] ?? "");
    setProspects((current) => current.map((item) => item.id === updated.id ? updated : item));
  };
  const promote = async (prospect: Prospect) => {
    const result = await promoteProspect(prospect.id);
    setProspects((current) => current.map((item) => item.id === prospect.id ? { ...item, promoted_crawl_agency_id: result.crawl_agency.id } : item));
    toast.success("Crawl Agency criada em onboarding.");
  };

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-semibold">Prospecção</h2>
      <Card className="scroll-mt-16" id="nova-prospeccao">
        <CardHeader><CardTitle>Nova prospecção por cidade</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div><Label htmlFor="prospect-city">Cidade</Label><Input id="prospect-city" onChange={(event) => setCity(event.target.value)} value={city} /></div>
          <div><Label htmlFor="prospect-state">UF</Label><Input id="prospect-state" maxLength={2} onChange={(event) => setState(event.target.value)} value={state} /></div>
          <div className="min-w-72"><Label htmlFor="prospect-batch">Cidades em lote (Cidade,UF por linha)</Label><textarea className="min-h-20 w-full rounded-md border bg-transparent p-2" id="prospect-batch" onChange={(event) => setBatchCities(event.target.value)} value={batchCities} /></div>
          <div className="flex items-center gap-2"><Checkbox checked={requeryKnown} id="requery-known" onCheckedChange={(checked) => { setRequeryKnown(checked === true); setRequeryPreview(null); setRequeryConfirmed(false); }} /><Label htmlFor="requery-known">Reconsultar domínios conhecidos</Label></div>
          {requeryKnown && <Button onClick={() => void previewProspectingRequery(cities()).then(setRequeryPreview)} type="button" variant="outline">Calcular impacto</Button>}
          {requeryPreview && <div className="space-y-2"><p>{requeryPreview.total} domínios conhecidos serão reconsultados</p><div className="flex items-center gap-2"><Checkbox checked={requeryConfirmed} id="confirm-requery" onCheckedChange={(checked) => setRequeryConfirmed(checked === true)} /><Label htmlFor="confirm-requery">Confirmar reconsulta</Label></div></div>}
          <Button disabled={(!batchCities.trim() && (!city.trim() || state.trim().length !== 2)) || (requeryKnown && (!requeryPreview || !requeryConfirmed))} onClick={() => void queue()}>Prospectar cidade</Button>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Input aria-label="Filtrar cidade" onChange={(event) => setCityFilter(event.target.value)} placeholder="Cidade" value={cityFilter} />
        <Input aria-label="Filtrar operação" onChange={(event) => setOperationFilter(event.target.value)} placeholder="ID da operação" type="number" value={operationFilter} />
        <select aria-label="Filtrar revisão" className="rounded-md border bg-transparent px-3" onChange={(event) => setReviewFilter(event.target.value)} value={reviewFilter}>
          <option value="">Todas as revisões</option><option value="pending">Pendentes</option><option value="approved">Aprovados</option><option value="rejected">Rejeitados</option>
        </select>
        <select aria-label="Filtrar classificação" className="rounded-md border bg-transparent px-3" onChange={(event) => setClassificationFilter(event.target.value)} value={classificationFilter}>
          <option value="">Todas as classificações</option><option value="candidate">Candidatos</option><option value="rejected">Rejeitados automaticamente</option>
        </select>
      </div>
      <div className="space-y-3">
        {filtered.map((prospect) => (
          <Card key={prospect.id}>
            <CardContent className="space-y-3 pt-6">
              <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{prospect.name}</p><Badge>{prospect.automatic_classification}</Badge><Badge variant="outline">{prospect.review_state}</Badge></div>
              <p>{prospect.city}/{prospect.state} · {prospect.root_domain ?? "sem domínio"}</p>
              {prospect.automatic_reason && <p>{prospect.automatic_reason}</p>}
              {prospect.review_reason && <p>Decisão humana: {prospect.review_reason}</p>}
              <Input aria-label={`Motivo para ${prospect.name}`} onChange={(event) => setReasons((current) => ({ ...current, [prospect.id]: event.target.value }))} placeholder="Justificativa da revisão" value={reasons[prospect.id] ?? ""} />
              <div className="flex gap-2">
                <Button disabled={(reasons[prospect.id] ?? "").trim().length < 10} onClick={() => void decide(prospect, "approved")} size="sm">Aprovar</Button>
                <Button disabled={(reasons[prospect.id] ?? "").trim().length < 10} onClick={() => void decide(prospect, "rejected")} size="sm" variant="outline">Rejeitar</Button>
                {prospect.review_state === "approved" && !prospect.promoted_crawl_agency_id && <Button onClick={() => void promote(prospect)} size="sm" variant="secondary">Promover para Crawl Agency</Button>}
                {prospect.promoted_crawl_agency_id && <Link className="text-sm underline" href={`/admin/crawler/agencies/${prospect.promoted_crawl_agency_id}`}>Abrir onboarding</Link>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
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
