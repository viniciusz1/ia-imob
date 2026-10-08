import { CircleAlert, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { CrawlRun } from "@/types/crawler";

const publicationStatus: Record<CrawlRun["publication_state"], { label: string; variant: "info" | "success" | "warning" }> = {
  candidate: { label: "Candidato", variant: "info" },
  published: { label: "Publicado", variant: "success" },
  quarantined: { label: "Quarentena", variant: "warning" },
};

export function CrawlRunSnapshotsPanel({ runs }: { runs: CrawlRun[] }) {
  if (runs.length === 0) return <p className="text-sm text-muted-foreground">Nenhum snapshot produzido.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {runs.map((run) => (
        <div className="space-y-3 rounded-lg border p-4" key={run.id}>
          <div className="flex items-center justify-between gap-3">
            <Link className="text-sm text-primary hover:underline" href={`/admin/crawler/runs/${run.id}`}>
              Snapshot #{run.id}
            </Link>
            <Badge variant={publicationStatus[run.publication_state].variant}>
              {publicationStatus[run.publication_state].label}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-sm tabular-nums">
              {run.counts.normalized} normalizados · {run.counts.rejected} rejeitados · {run.counts.errors} erros
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              Contrato v{run.market_data_contract_version_id} · Política v{run.quality_policy_version_id}
            </p>
          </div>
          {run.quality_report?.blockers.map((blocker) => (
            <p className="flex items-start gap-1.5 text-xs text-destructive" key={blocker}>
              <CircleAlert className="mt-px size-3.5 shrink-0" />
              {blocker}
            </p>
          ))}
          {run.quality_report?.warnings.map((warning) => (
            <p className="flex items-start gap-1.5 text-xs text-warning" key={warning}>
              <TriangleAlert className="mt-px size-3.5 shrink-0" />
              {warning}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
