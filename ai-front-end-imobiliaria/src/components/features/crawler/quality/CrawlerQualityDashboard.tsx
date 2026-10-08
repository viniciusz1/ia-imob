import { CircleAlert, ShieldAlert, ShieldCheck, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { CrawlRun } from "@/types/crawler";

interface QualitySnapshotListProps {
  emptyMessage: string;
  icon: LucideIcon;
  runs: CrawlRun[];
}

function QualitySnapshotList({ emptyMessage, icon, runs }: QualitySnapshotListProps) {
  if (runs.length === 0) {
    return <EmptyState icon={icon} title={emptyMessage} variant="inline" />;
  }

  return (
    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
      {runs.map((run) => (
        <div className="space-y-3 rounded-lg border p-4" key={run.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link className="text-sm text-primary hover:underline" href={`/admin/crawler/runs/${run.id}`}>
              Revisar snapshot #{run.id}
            </Link>
            <Badge variant={run.publication_state === "quarantined" ? "warning" : "info"}>
              {run.publication_state === "quarantined" ? "Quarentena" : "Publicado excepcionalmente"}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground tabular-nums">
              <Link className="text-primary hover:underline" href={`/admin/crawler/agencies/${run.crawl_agency_id}`}>
                Crawl Agency #{run.crawl_agency_id}
              </Link>
              {" · "}Contrato v{run.market_data_contract_version_id}{" · "}Política v{run.quality_policy_version_id}
            </p>
            <p className="text-sm tabular-nums">
              {run.counts.normalized} normalizados · {run.counts.rejected} rejeitados · {run.counts.errors} erros
            </p>
          </div>
          {run.quality_report?.blockers.map((blocker) => (
            <p className="flex items-start gap-1.5 text-xs text-destructive" key={blocker}>
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              {blocker}
            </p>
          ))}
          {run.exceptional_publication && (
            <p className="text-xs text-muted-foreground">
              Publicado por #{run.exceptional_publication.published_by}: {run.exceptional_publication.reason}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function CrawlerQualityDashboard({ runs }: { runs: CrawlRun[] }) {
  const quarantinedRuns = runs.filter((run) => run.publication_state === "quarantined");
  const exceptionalRuns = runs.filter((run) => run.exceptional_publication !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Revise evidências bloqueantes e acompanhe decisões excepcionais sem alterar o histórico de qualidade."
        title="Qualidade"
      />

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader icon={ShieldAlert} title="Snapshots em quarentena" />
        <QualitySnapshotList emptyMessage="Nenhum snapshot em quarentena." icon={ShieldAlert} runs={quarantinedRuns} />
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader icon={ShieldCheck} title="Publicações excepcionais" />
        <QualitySnapshotList
          emptyMessage="Nenhuma publicação excepcional registrada."
          icon={ShieldCheck}
          runs={exceptionalRuns}
        />
      </Card>
    </div>
  );
}
