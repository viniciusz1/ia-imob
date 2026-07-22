"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CrawlAgency, CrawlAgencySchedule, CrawlerOperation, CrawlRun, ExtractionProfile } from "@/types/crawler";

import { isActiveCrawlerOperation, useCrawlerOperationPolling } from "../useCrawlerOperationPolling";
import { CrawlAgencyContextHeader } from "./CrawlAgencyContextHeader";

interface CrawlAgencyWorkspaceClientProps {
  agency: CrawlAgency;
  initialOperations: CrawlerOperation[];
  profiles: ExtractionProfile[];
  runs: CrawlRun[];
  schedule: CrawlAgencySchedule;
}

function readiness(agency: CrawlAgency, profiles: ExtractionProfile[], runs: CrawlRun[]) {
  if (agency.revalidation_required) return { label: "Revalidação necessária", detail: "O perfil precisa ser validado antes de novas publicações.", href: "profiles", action: "Revalidar perfil" };
  if (agency.lifecycle_state === "onboarding") {
    const candidate = profiles.find((profile) => ["candidate", "revalidation_required"].includes(profile.status));
    if (candidate) return { label: "Aguardando validação", detail: `Perfil v${candidate.version} precisa passar pelo Crawl de Validação.`, href: "profiles", action: "Validar perfil" };
    return { label: "Onboarding em andamento", detail: "Crie um Discovery e gere um Perfil de Extração Candidato.", href: "discoveries", action: "Continuar onboarding" };
  }
  if (!runs.some((run) => run.publication_state === "published")) return { label: "Sem snapshot publicado", detail: "A fonte está ativa, mas ainda não possui dados vigentes.", href: "crawls", action: "Rodar crawl manual" };
  return { label: "Apta para produção", detail: "Perfil e dados vigentes estão disponíveis.", href: "crawls", action: "Rodar crawl manual" };
}

export function CrawlAgencyWorkspaceClient({ agency, initialOperations, profiles, runs, schedule }: CrawlAgencyWorkspaceClientProps) {
  const [operations, setOperations] = useState(initialOperations);
  const activeOperation = operations.find(isActiveCrawlerOperation);
  const publishedRun = runs.find((run) => run.publication_state === "published");
  const quarantinedRun = runs.find((run) => run.publication_state === "quarantined");
  const state = useMemo(() => readiness(agency, profiles, runs), [agency, profiles, runs]);

  useCrawlerOperationPolling({
    operations: activeOperation ? [activeOperation] : [],
    onOperation: (updated) => setOperations((current) => current.map((operation) => operation.id === updated.id ? updated : operation)),
  });

  const formatDate = (value: string | null) => value === null ? "—" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
  const root = `/admin/crawler/agencies/${agency.id}`;
  const recent = operations.slice(0, 5);

  return <section className="space-y-6">
    <CrawlAgencyContextHeader agency={agency} area="Visão geral" description="Estado operacional, prontidão e atividade recente desta fonte." />
    <div className="flex flex-wrap gap-2"><Badge variant="outline">{agency.lifecycle_state}</Badge><Badge variant="secondary">Saúde: {agency.health_state}</Badge><Badge variant={agency.revalidation_required ? "destructive" : "outline"}>{state.label}</Badge></div>

    <Card className="border-primary/30 bg-primary/5"><CardHeader><CardTitle>Próxima ação recomendada</CardTitle><CardDescription>{state.detail}</CardDescription></CardHeader><CardContent><Button asChild className="cursor-pointer"><Link href={`${root}/${state.href}`}>{state.action}</Link></Button></CardContent></Card>

    <div className="grid gap-4 lg:grid-cols-3">
      <Card><CardHeader><CardTitle>Operação atual</CardTitle></CardHeader><CardContent className="space-y-3">
        {activeOperation ? <><div className="flex justify-between gap-2"><span>#{activeOperation.id} · {activeOperation.type}</span><Badge>{activeOperation.state}</Badge></div><Progress value={activeOperation.progress.percentage} /><p className="text-sm">{activeOperation.progress.stage} · {activeOperation.progress.percentage}% · {activeOperation.progress.processed}/{activeOperation.progress.total ?? "—"}</p><p className="text-sm text-muted-foreground">{activeOperation.progress.message ?? "Aguardando atualização"} · heartbeat {formatDate(activeOperation.progress.heartbeat_at)}</p><Link className="cursor-pointer text-sm underline" href={`/admin/crawler/operations?crawl_agency_id=${agency.id}`}>Abrir na fila global</Link></> : <><p>Nenhuma operação em andamento.</p><p className="text-sm text-muted-foreground">Crawl livre para iniciar.</p></>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Dados vigentes</CardTitle></CardHeader><CardContent className="space-y-2">
        {publishedRun ? <><Link className="cursor-pointer font-medium underline" href={`/admin/crawler/runs/${publishedRun.id}`}>Snapshot #{publishedRun.id} publicado</Link><p>{publishedRun.counts.normalized} imóveis normalizados</p><p className="text-sm text-muted-foreground">Publicado em {formatDate(publishedRun.published_at)}</p></> : <p className="text-muted-foreground">Nenhum snapshot publicado.</p>}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Agendamento</CardTitle></CardHeader><CardContent className="space-y-2"><p>{schedule.effective_preset} · {schedule.effective_timezone}</p><p className="text-sm text-muted-foreground">Próxima execução: {formatDate(schedule.next_run_at)}</p><Badge variant={schedule.suspended ? "destructive" : "secondary"}>{schedule.suspended ? "Suspenso" : `Circuito ${schedule.circuit.state}`}</Badge><Link className="block cursor-pointer text-sm underline" href={`${root}/schedule`}>Ver agendamento</Link></CardContent></Card>
    </div>

    {(quarantinedRun || agency.revalidation_required) && <Card><CardHeader><CardTitle>Precisa de atenção</CardTitle></CardHeader><CardContent className="space-y-2">{agency.revalidation_required && <Link className="block cursor-pointer underline" href={`${root}/profiles`}>Revalidação necessária: revise e valide o Perfil de Extração.</Link>}{quarantinedRun && <Link className="block cursor-pointer underline" href={`/admin/crawler/runs/${quarantinedRun.id}`}>Snapshot #{quarantinedRun.id} está em quarentena. Revisar qualidade.</Link>}</CardContent></Card>}

    <Card><CardHeader><CardTitle>Atividade recente</CardTitle><CardDescription>Operações desta Crawl Agency.</CardDescription></CardHeader><CardContent><ol className="space-y-3">{recent.length === 0 ? <li className="text-muted-foreground">Nenhuma atividade registrada.</li> : recent.map((operation) => <li className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-0" key={operation.id}><span>#{operation.id} · {operation.type} · {operation.state}</span><Link className="cursor-pointer text-sm underline" href={`/admin/crawler/operations?crawl_agency_id=${agency.id}`}>Ver operação</Link></li>)}</ol></CardContent></Card>
  </section>;
}
