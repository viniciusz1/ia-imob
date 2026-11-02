import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CrawlRun } from "@/types/crawler";

interface QualitySnapshotListProps {
  emptyMessage: string;
  runs: CrawlRun[];
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function QualitySnapshotList({ emptyMessage, runs }: QualitySnapshotListProps) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Snapshot</TableHead>
          <TableHead>Imobiliária</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead>Métricas</TableHead>
          <TableHead className="min-w-48">Bloqueadores / Observações</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run) => (
          <TableRow key={run.id}>
            <TableCell>
              <div className="space-y-0.5">
                <Link className="font-medium underline hover:text-primary" href={`/admin/crawler/runs/${run.id}`}>
                  {run.quality_rejection ? "Ver" : "Revisar"} snapshot #{run.id}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Contrato v{run.market_data_contract_version_id} · Política v{run.quality_policy_version_id}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-0.5">
                <Link className="font-medium underline hover:text-primary" href={`/admin/crawler/agencies/${run.crawl_agency_id}`}>
                  {run.crawl_agency?.name ?? `Crawl Agency #${run.crawl_agency_id}`}
                </Link>
                {run.crawl_agency?.name && (
                  <p className="text-xs text-muted-foreground">
                    Crawl Agency #{run.crawl_agency_id}
                  </p>
                )}
              </div>
            </TableCell>
            <TableCell>
              <div className="space-y-0.5 text-sm">
                <time className="block font-medium" dateTime={run.created_at}>
                  {formatDateTime(run.created_at)}
                </time>
                {run.quarantined_at && (
                  <span className="block text-xs text-muted-foreground">
                    Quarentena: {formatDateTime(run.quarantined_at)}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <p className="text-sm">
                <span>{run.counts.normalized} normalizados</span>
                <span className="text-muted-foreground"> · </span>
                <span className={run.counts.rejected > 0 ? "font-medium text-destructive" : ""}>
                  {run.counts.rejected} rejeitados
                </span>
                <span className="text-muted-foreground"> · </span>
                <span className={run.counts.errors > 0 ? "font-medium text-destructive" : ""}>
                  {run.counts.errors} erros
                </span>
              </p>
            </TableCell>
            <TableCell className="max-w-xs whitespace-normal">
              <div className="space-y-1">
                {run.quality_report?.blockers.map((blocker) => (
                  <p className="text-sm text-destructive" key={blocker}>
                    {blocker}
                  </p>
                ))}
                {run.exceptional_publication && (
                  <p className="text-xs text-muted-foreground">
                    Publicado por #{run.exceptional_publication.published_by}: {run.exceptional_publication.reason}
                  </p>
                )}
                {run.quality_rejection && (
                  <p className="text-xs text-muted-foreground">
                    Recusado por #{run.quality_rejection.rejected_by}: {run.quality_rejection.reason}
                  </p>
                )}
                {!run.quality_report?.blockers?.length && !run.exceptional_publication && !run.quality_rejection && (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={run.publication_state === "quarantined" ? "destructive" : "secondary"}>
                {run.quality_rejection
                  ? "Publicação recusada"
                  : run.publication_state === "quarantined"
                    ? "Quarentena"
                    : "Publicado excepcionalmente"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Link
                className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                href={`/admin/crawler/runs/${run.id}`}
              >
                {run.quality_rejection ? "Ver" : "Revisar"}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CrawlerQualityDashboard({ runs }: { runs: CrawlRun[] }) {
  const quarantinedRuns = runs.filter((run) => run.publication_state === "quarantined" && run.quality_rejection === null);
  const rejectedRuns = runs.filter((run) => run.quality_rejection !== null);
  const exceptionalRuns = runs.filter((run) => run.exceptional_publication !== null);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Qualidade</h2>
        <p className="text-muted-foreground">
          Revise evidências bloqueantes e acompanhe recusas e publicações excepcionais sem alterar o histórico de qualidade.
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
          <CardTitle><h3>Snapshots recusados</h3></CardTitle>
        </CardHeader>
        <CardContent>
          <QualitySnapshotList emptyMessage="Nenhuma publicação recusada." runs={rejectedRuns} />
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
