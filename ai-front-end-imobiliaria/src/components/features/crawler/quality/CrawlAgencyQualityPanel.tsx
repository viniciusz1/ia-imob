import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrawlRun } from "@/types/crawler";

function SnapshotRow({ run }: { run: CrawlRun }) {
  const label = run.publication_state === "candidate" ? "Avaliação pendente" : run.publication_state === "quarantined" ? "Em quarentena" : "Publicado";
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"><div><p className="font-medium">Snapshot #{run.id}</p><p className="text-sm text-muted-foreground">{run.counts.normalized} normalizados · Política v{run.quality_policy_version_id}</p></div><div className="flex items-center gap-3"><Badge variant={run.publication_state === "quarantined" ? "destructive" : "outline"}>{label}</Badge><Link className="underline" href={`/admin/crawler/runs/${run.id}`}>{run.publication_state === "quarantined" ? "Revisar evidências" : "Ver detalhe"}</Link></div></div>;
}

export function CrawlAgencyQualityPanel({ currentPublishedRunId, runs }: { currentPublishedRunId: number | null; runs: CrawlRun[] }) {
  const actionRequired = runs.filter((run) => run.publication_state === "candidate" || run.publication_state === "quarantined");
  const currentPublished = runs.find((run) => run.id === currentPublishedRunId) ?? null;

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle><h3>Requer ação</h3></CardTitle><CardDescription>Avaliações pendentes ou falhas e snapshots que exigem revisão humana.</CardDescription></CardHeader><CardContent>{actionRequired.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma ação de qualidade pendente.</p> : actionRequired.map((run) => <SnapshotRow key={run.id} run={run} />)}</CardContent></Card>
    <Card><CardHeader><CardTitle><h3>Snapshot Publicado atual</h3></CardTitle></CardHeader><CardContent>{currentPublished ? <SnapshotRow run={currentPublished} /> : <p className="text-sm text-muted-foreground">Nenhum Snapshot Publicado para esta Crawl Agency.</p>}</CardContent></Card>
    <Card><CardHeader><CardTitle><h3>Histórico de qualidade</h3></CardTitle><CardDescription>Avaliações, publicações, quarentenas e decisões excepcionais desta Crawl Agency.</CardDescription></CardHeader><CardContent>{runs.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum snapshot de produção avaliado.</p> : runs.map((run) => <SnapshotRow key={run.id} run={run} />)}</CardContent></Card>
  </div>;
}
