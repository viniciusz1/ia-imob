import { notFound } from "next/navigation";

import { CrawlerOperationStatus } from "@/components/features/crawler/CrawlerOperationStatus";
import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { ProfileEvidenceInspector } from "@/components/features/crawler/profiles/ProfileEvidenceInspector";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency, getCrawlerOperation, getProfileValidationReport } from "@/services/crawlerService";

function numericResult(operationResult: Record<string, unknown> | null, key: string): number | null {
  const value = operationResult?.[key];
  return typeof value === "number" ? value : null;
}

export default async function CrawlOperationDetailPage({ params }: { params: Promise<{ id: string; operationId: string }> }) {
  const { id, operationId } = await params;
  const agencyId = Number(id);
  const [agency, operation] = await Promise.all([getCrawlAgency(agencyId), getCrawlerOperation(Number(operationId))]);
  if (operation.crawl_agency_id !== agencyId || !["profile_validation", "production_crawl"].includes(operation.type)) notFound();

  const reportId = numericResult(operation.result, "profile_validation_report_id");
  const report = reportId === null ? null : await getProfileValidationReport(reportId);
  const profileId = report?.extraction_profile_id ?? numericResult(operation.plan, "extraction_profile_id");
  const validRatioRecommended = report !== null && report.valid_ratio >= 0.8;
  const coverageRecommended = report !== null && Object.values(report.required_field_coverage).every((coverage) => coverage >= 0.9);
  const recommended = validRatioRecommended && coverageRecommended && (report?.blocking_failures.length ?? 0) === 0;

  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area={`Execução #${operation.id}`} description={operation.type === "profile_validation" ? "Detalhe compartilhável do Crawl de Validação." : "Detalhe da execução de produção."} /><Card><CardHeader><CardTitle>{operation.type === "profile_validation" ? "Crawl de Validação" : "Crawl de Produção"}</CardTitle><CardDescription>Operação #{operation.id}</CardDescription></CardHeader><CardContent><CrawlerOperationStatus agencyId={agencyId} operation={operation} /></CardContent></Card>{report && profileId !== null && <Card><CardHeader className="flex-row items-start justify-between gap-3"><div><CardTitle>Resultado da validação</CardTitle><CardDescription>Recomendações técnicas; a decisão humana permanece em Perfis de Extração.</CardDescription></div><Badge variant={recommended ? "secondary" : "outline"}>{recommended ? "Dentro da recomendação" : "Fora da recomendação"}</Badge></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Registros válidos</p><p className="text-lg font-semibold">{report.valid_record_count}/{report.sampled_url_count} · {Math.round(report.valid_ratio * 100)}%</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Cobertura obrigatória</p><p className="text-lg font-semibold">{coverageRecommended ? "Atendida" : "Abaixo do recomendado"}</p></div><div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Falhas Críticas de Validação</p><p className="text-lg font-semibold">{report.blocking_failures.length}</p></div></div>{report.blocking_failures.map((failure) => <p className="text-sm text-destructive" key={failure}>Falha Crítica de Validação: {failure}</p>)}{report.warnings.map((warning) => <p className="text-sm text-amber-700" key={warning}>{warning}</p>)}<ProfileEvidenceInspector agencyId={agencyId} profileId={profileId} reportId={report.id} totalRecords={report.sampled_url_count} /></CardContent></Card>}</section>;
}
