"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { decideProspect, promoteProspect, queueProspectingOperation } from "@/services/crawlerService";
import type { Prospect } from "@/types/crawler";

export function ProspectsClient({ initialProspects }: { initialProspects: Prospect[] }) {
  const [prospects, setProspects] = useState(initialProspects);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("");
  const [reasons, setReasons] = useState<Record<number, string>>({});
  const filtered = useMemo(() => prospects.filter((prospect) =>
    (!reviewFilter || prospect.review_state === reviewFilter)
    && (!classificationFilter || prospect.automatic_classification === classificationFilter),
  ), [classificationFilter, prospects, reviewFilter]);

  const queue = async () => {
    const operation = await queueProspectingOperation(city, state.toUpperCase());
    toast.success(`Prospecção #${operation.id} enfileirada.`);
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
      <Card>
        <CardHeader><CardTitle>Nova prospecção por cidade</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div><Label htmlFor="prospect-city">Cidade</Label><Input id="prospect-city" onChange={(event) => setCity(event.target.value)} value={city} /></div>
          <div><Label htmlFor="prospect-state">UF</Label><Input id="prospect-state" maxLength={2} onChange={(event) => setState(event.target.value)} value={state} /></div>
          <Button disabled={!city.trim() || state.trim().length !== 2} onClick={() => void queue()}>Prospectar cidade</Button>
        </CardContent>
      </Card>
      <div className="flex gap-3">
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
    </section>
  );
}
