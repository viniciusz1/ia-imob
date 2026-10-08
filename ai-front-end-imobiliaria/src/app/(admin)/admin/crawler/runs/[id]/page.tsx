import { Database } from "lucide-react";

import { CrawlRunDataTable } from "@/components/features/crawler/runs/CrawlRunDataTable";
import { ExceptionalPublicationPanel } from "@/components/features/crawler/runs/ExceptionalPublicationPanel";
import { QualityEvaluationPanel } from "@/components/features/crawler/runs/QualityEvaluationPanel";
import { OperationStateBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlRun, listCrawlRunRecords } from "@/services/crawlerService";
import type { CrawlRun } from "@/types/crawler";

interface CrawlRunPageProps {
  params: Promise<{ id: string }>;
}

const publicationStatus: Record<CrawlRun["publication_state"], { label: string; variant: "info" | "success" | "warning" }> = {
  candidate: { label: "Candidato", variant: "info" },
  published: { label: "Publicado", variant: "success" },
  quarantined: { label: "Quarentena", variant: "warning" },
};

export default async function CrawlRunPage({ params }: CrawlRunPageProps) {
  const { id } = await params;
  const runId = Number(id);
  const [run, initialPage] = await Promise.all([
    getCrawlRun(runId),
    listCrawlRunRecords(runId, { view: "normalized", sort: "-created_at", page: 1, per_page: 10 }),
  ]);
  const publication = publicationStatus[run.publication_state];

  return (
    <div className="space-y-6">
      <PageHeader
        backHref={`/admin/crawler/agencies/${run.crawl_agency_id}`}
        badge={
          <>
            <OperationStateBadge state={run.technical_state} />
            {run.result_kind === "partial" ? (
              <Badge variant="destructive">Resultado parcial · não publicável</Badge>
            ) : (
              <Badge variant={publication.variant}>{publication.label}</Badge>
            )}
          </>
        }
        description={`Crawl Agency #${run.crawl_agency_id}`}
        title={`Crawl Run #${run.id}`}
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Evidências de qualidade</CardTitle>
        </CardHeader>
        <CardContent>
          <QualityEvaluationPanel initialRun={run} />
        </CardContent>
      </Card>

      <ExceptionalPublicationPanel initialRun={run} key={run.quality_report?.id ?? "pending"} />

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader icon={Database} title="Dados persistidos" />
        <CrawlRunDataTable initialPage={initialPage} runId={run.id} />
      </Card>
    </div>
  );
}
