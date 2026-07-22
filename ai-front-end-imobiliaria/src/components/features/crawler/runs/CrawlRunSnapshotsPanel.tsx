import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CrawlRun } from "@/types/crawler";

const labels: Record<CrawlRun["publication_state"], string> = {
  candidate: "Candidato",
  published: "Publicado",
  quarantined: "Quarentena",
};

export function CrawlRunSnapshotsPanel({ runs }: { runs: CrawlRun[] }) {
  if (runs.length === 0) return <p className="text-sm text-muted-foreground">Nenhum snapshot produzido.</p>;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {runs.map((run) => (
        <Card key={run.id}>
          <CardContent className="space-y-2 pt-6">
            <div className="flex items-center justify-between gap-3">
              <Link className="font-medium underline" href={`/admin/crawler/runs/${run.id}`}>Snapshot #{run.id}</Link>
              <Badge variant={run.publication_state === "quarantined" ? "destructive" : "outline"}>{labels[run.publication_state]}</Badge>
            </div>
            <p>{run.counts.normalized} normalizados · {run.counts.rejected} rejeitados · {run.counts.errors} erros</p>
            <p className="text-sm">Contrato v{run.market_data_contract_version_id} · Política v{run.quality_policy_version_id}</p>
            {run.quality_report?.blockers.map((blocker) => <p className="text-sm text-destructive" key={blocker}>{blocker}</p>)}
            {run.quality_report?.warnings.map((warning) => <p className="text-sm text-amber-700" key={warning}>{warning}</p>)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
