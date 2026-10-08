import { CircleCheck, History, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/EmptyState";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CrawlRun } from "@/types/crawler";

function publicationPresentation(state: CrawlRun["publication_state"]) {
  if (state === "candidate") return { label: "Avaliação pendente", variant: "warning" as const };
  if (state === "quarantined") return { label: "Em quarentena", variant: "destructive" as const };
  return { label: "Publicado", variant: "success" as const };
}

function SnapshotRow({ run }: { run: CrawlRun }) {
  const { label, variant } = publicationPresentation(run.publication_state);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm text-foreground">Snapshot #{run.id}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {run.counts.normalized} normalizados · Política v{run.quality_policy_version_id}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={variant}>{label}</Badge>
        <Link className="text-sm text-primary hover:underline" href={`/admin/crawler/runs/${run.id}`}>
          {run.publication_state === "quarantined" ? "Revisar evidências" : "Ver detalhe"}
        </Link>
      </div>
    </li>
  );
}

export function CrawlAgencyQualityPanel({ currentPublishedRunId, runs }: { currentPublishedRunId: number | null; runs: CrawlRun[] }) {
  const actionRequired = runs.filter((run) => run.publication_state === "candidate" || run.publication_state === "quarantined");
  const currentPublished = runs.find((run) => run.id === currentPublishedRunId) ?? null;

  return (
    <div className="space-y-6">
      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader
          as="h3"
          description="Avaliações pendentes ou falhas e snapshots que exigem revisão humana."
          icon={ShieldAlert}
          title="Requer ação"
        />
        {actionRequired.length === 0 ? (
          <EmptyState icon={ShieldAlert} title="Nenhuma ação de qualidade pendente." variant="inline" />
        ) : (
          <ul className="divide-y">
            {actionRequired.map((run) => <SnapshotRow key={run.id} run={run} />)}
          </ul>
        )}
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader as="h3" icon={CircleCheck} title="Snapshot Publicado atual" />
        {currentPublished ? (
          <ul className="divide-y">
            <SnapshotRow run={currentPublished} />
          </ul>
        ) : (
          <EmptyState icon={CircleCheck} title="Nenhum Snapshot Publicado para esta Crawl Agency." variant="inline" />
        )}
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader
          as="h3"
          description="Avaliações, publicações, quarentenas e decisões excepcionais desta Crawl Agency."
          icon={History}
          title="Histórico de qualidade"
        />
        {runs.length === 0 ? (
          <EmptyState icon={History} title="Nenhum snapshot de produção avaliado." variant="inline" />
        ) : (
          <ul className="divide-y">
            {runs.map((run) => <SnapshotRow key={run.id} run={run} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}
