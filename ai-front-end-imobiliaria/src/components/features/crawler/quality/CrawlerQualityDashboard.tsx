"use client";

import { CircleAlert, ShieldAlert, ShieldCheck, ShieldX, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientPagination } from "@/hooks/useClientPagination";
import type { CrawlRun } from "@/types/crawler";

interface QualitySnapshotListProps {
  emptyMessage: string;
  icon: LucideIcon;
  runs: CrawlRun[];
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function snapshotStatus(run: CrawlRun): { label: string; variant: "destructive" | "warning" | "info" } {
  if (run.quality_rejection) return { label: "Publicação recusada", variant: "destructive" };
  if (run.publication_state === "quarantined") return { label: "Quarentena", variant: "warning" };
  return { label: "Publicado excepcionalmente", variant: "info" };
}

function QualitySnapshotList({ emptyMessage, icon, runs }: QualitySnapshotListProps) {
  const pagination = useClientPagination(runs);
  const footer = (
    <PaginationFooter
      onPageChange={pagination.setPage}
      page={pagination.page}
      pageCount={pagination.pageCount}
      pageSize={pagination.pageSize}
      total={pagination.total}
    />
  );

  if (runs.length === 0) {
    return (
      <>
        <EmptyState icon={icon} title={emptyMessage} variant="inline" />
        {footer}
      </>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Snapshot</TableHead>
            <TableHead>Imobiliária</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead>Métricas</TableHead>
            <TableHead className="min-w-48">Bloqueadores / Observações</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-px text-right">
              <span className="sr-only">Ações</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagination.pageItems.map((run) => {
            const status = snapshotStatus(run);
            const action = run.quality_rejection ? "Ver" : "Revisar";

            return (
              <TableRow key={run.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <Link className="text-sm text-primary hover:underline" href={`/admin/crawler/runs/${run.id}`}>
                      {action} snapshot #{run.id}
                    </Link>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      Contrato v{run.market_data_contract_version_id} · Política v{run.quality_policy_version_id}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <Link className="text-sm text-primary hover:underline" href={`/admin/crawler/agencies/${run.crawl_agency_id}`}>
                      {run.crawl_agency?.name ?? `Crawl Agency #${run.crawl_agency_id}`}
                    </Link>
                    {run.crawl_agency?.name && (
                      <p className="text-xs text-muted-foreground tabular-nums">Crawl Agency #{run.crawl_agency_id}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-sm tabular-nums">
                    <time className="block" dateTime={run.created_at}>{formatDateTime(run.created_at)}</time>
                    {run.quarantined_at && (
                      <span className="block text-xs text-muted-foreground">
                        Quarentena: {formatDateTime(run.quarantined_at)}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <p className="text-sm tabular-nums">
                    <span>{run.counts.normalized} normalizados</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className={run.counts.rejected > 0 ? "text-destructive" : undefined}>{run.counts.rejected} rejeitados</span>
                    <span className="text-muted-foreground"> · </span>
                    <span className={run.counts.errors > 0 ? "text-destructive" : undefined}>{run.counts.errors} erros</span>
                  </p>
                </TableCell>
                <TableCell className="max-w-xs whitespace-normal">
                  <div className="space-y-1">
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
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild size="xs" variant="outline">
                    <Link href={`/admin/crawler/runs/${run.id}`}>{action}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {footer}
    </>
  );
}

export function CrawlerQualityDashboard({ runs }: { runs: CrawlRun[] }) {
  const quarantinedRuns = runs.filter((run) => run.publication_state === "quarantined" && run.quality_rejection === null);
  const rejectedRuns = runs.filter((run) => run.quality_rejection !== null);
  const exceptionalRuns = runs.filter((run) => run.exceptional_publication !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Revise evidências bloqueantes e acompanhe recusas e publicações excepcionais sem alterar o histórico de qualidade."
        title="Qualidade"
      />

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader icon={ShieldAlert} title="Snapshots em quarentena" />
        <QualitySnapshotList emptyMessage="Nenhum snapshot em quarentena." icon={ShieldAlert} runs={quarantinedRuns} />
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader icon={ShieldX} title="Snapshots recusados" />
        <QualitySnapshotList emptyMessage="Nenhuma publicação recusada." icon={ShieldX} runs={rejectedRuns} />
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
