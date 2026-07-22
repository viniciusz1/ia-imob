import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrawlRun } from "@/types/crawler";

interface QualitySnapshotListProps {
  emptyMessage: string;
  runs: CrawlRun[];
}

function QualitySnapshotList({ emptyMessage, runs }: QualitySnapshotListProps) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {runs.map((run) => (
        <div className="space-y-3 rounded-md border p-4" key={run.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link className="font-medium underline" href={`/admin/crawler/runs/${run.id}`}>
              Revisar snapshot #{run.id}
            </Link>
            <Badge variant={run.publication_state === "quarantined" ? "destructive" : "secondary"}>
              {run.publication_state === "quarantined" ? "Quarentena" : "Publicado excepcionalmente"}
            </Badge>
          </div>
          <p className="text-sm">
            <Link className="underline" href={`/admin/crawler/agencies/${run.crawl_agency_id}`}>
              Crawl Agency #{run.crawl_agency_id}
            </Link>
            {" · "}Contrato v{run.market_data_contract_version_id}{" · "}Política v{run.quality_policy_version_id}
          </p>
          <p className="text-sm">
            {run.counts.normalized} normalizados · {run.counts.rejected} rejeitados · {run.counts.errors} erros
          </p>
          {run.quality_report?.blockers.map((blocker) => (
            <p className="text-sm text-destructive" key={blocker}>{blocker}</p>
          ))}
          {run.exceptional_publication && (
            <p className="text-sm text-muted-foreground">
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
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Qualidade</h2>
        <p className="text-muted-foreground">
          Revise evidências bloqueantes e acompanhe decisões excepcionais sem alterar o histórico de qualidade.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><h3>Snapshots em quarentena</h3></CardTitle>
        </CardHeader>
        <CardContent>
          <QualitySnapshotList emptyMessage="Nenhum snapshot em quarentena." runs={quarantinedRuns} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3>Publicações excepcionais</h3></CardTitle>
        </CardHeader>
        <CardContent>
          <QualitySnapshotList emptyMessage="Nenhuma publicação excepcional registrada." runs={exceptionalRuns} />
        </CardContent>
      </Card>
    </section>
  );
}
