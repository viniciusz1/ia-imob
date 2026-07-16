import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrawlRunDataTable } from "@/components/features/crawler/runs/CrawlRunDataTable";
import { getCrawlRun, listCrawlRunRecords } from "@/services/crawlerService";

interface CrawlRunPageProps {
  params: Promise<{ id: string }>;
}

export default async function CrawlRunPage({ params }: CrawlRunPageProps) {
  const { id } = await params;
  const runId = Number(id);
  const [run, initialPage] = await Promise.all([
    getCrawlRun(runId),
    listCrawlRunRecords(runId, { view: "normalized", sort: "-created_at", page: 1, per_page: 25 }),
  ]);

  return (
    <section className="space-y-6">
      <Link className="text-sm underline" href={`/admin/crawler/agencies/${run.crawl_agency_id}`}>Voltar para Crawl Agency</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">Crawl Run #{run.id}</h2>
        <Badge variant="outline">{run.technical_state}</Badge>
        <Badge variant={run.result_kind === "partial" ? "destructive" : "secondary"}>{run.result_kind === "partial" ? "Resultado parcial · não publicável" : run.publication_state}</Badge>
      </div>
      <Card>
        <CardHeader><CardTitle>Dados persistidos</CardTitle></CardHeader>
        <CardContent><CrawlRunDataTable initialPage={initialPage} runId={run.id} /></CardContent>
      </Card>
    </section>
  );
}
