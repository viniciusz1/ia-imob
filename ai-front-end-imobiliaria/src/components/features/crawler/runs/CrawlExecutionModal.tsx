"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CrawlerOperationStatus } from "@/components/features/crawler/CrawlerOperationStatus";
import { ProfileEvidenceInspector } from "@/components/features/crawler/profiles/ProfileEvidenceInspector";
import { CrawlRunDataTable } from "@/components/features/crawler/runs/CrawlRunDataTable";
import { ExceptionalPublicationPanel } from "@/components/features/crawler/runs/ExceptionalPublicationPanel";
import { QualityEvaluationPanel } from "@/components/features/crawler/runs/QualityEvaluationPanel";
import {
  isActiveCrawlerOperation,
  useCrawlerOperationPolling,
} from "@/components/features/crawler/useCrawlerOperationPolling";
import {
  getCrawlerOperation,
  getCrawlRun,
  getProfileValidationReport,
  listCrawlRunRecords,
} from "@/services/crawlerService";
import type {
  CrawlerOperation,
  CrawlRun,
  PaginatedCrawlRunRecords,
  ProfileValidationReport,
} from "@/types/crawler";

export interface CrawlExecutionModalProps {
  agencyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  operation: CrawlerOperation | null;
  run: CrawlRun | null;
}

const stateLabels: Record<CrawlerOperation["state"], string> = {
  queued: "Na fila",
  running: "Em andamento",
  cancellation_requested: "Cancelamento solicitado",
  succeeded: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

function numericResult(record: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "number" ? value : null;
}

export function CrawlExecutionModal({
  agencyId,
  open,
  onOpenChange,
  operation: initialOperation,
  run: initialRun,
}: CrawlExecutionModalProps) {
  const [operation, setOperation] = useState<CrawlerOperation | null>(initialOperation);
  const [run, setRun] = useState<CrawlRun | null>(initialRun);
  const [report, setReport] = useState<ProfileValidationReport | null>(null);
  const [recordsPage, setRecordsPage] = useState<PaginatedCrawlRunRecords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePollingOperations = operation && isActiveCrawlerOperation(operation) ? [operation] : [];
  useCrawlerOperationPolling({
    enabled: open && activePollingOperations.length > 0,
    operations: activePollingOperations,
    onOperation: (updated) => setOperation(updated),
  });

  useEffect(() => {
    setOperation(initialOperation);
    setRun(initialRun);
    setReport(null);
    setRecordsPage(null);
    setError(null);

    if (!open || (!initialOperation && !initialRun)) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    async function fetchData() {
      try {
        let opData = initialOperation;
        if (initialOperation?.id) {
          try {
            opData = await getCrawlerOperation(initialOperation.id);
            if (isMounted) setOperation(opData);
          } catch {
            // keep initial operation
          }
        }

        let runData = initialRun;
        if (initialRun?.id) {
          try {
            runData = await getCrawlRun(initialRun.id);
            if (isMounted) setRun(runData);
          } catch {
            // keep initial run
          }
        }

        if (runData?.id) {
          try {
            const page = await listCrawlRunRecords(runData.id, {
              view: "normalized",
              sort: "-created_at",
              page: 1,
              per_page: 25,
            });
            if (isMounted) setRecordsPage(page);
          } catch {
            if (isMounted) {
              setRecordsPage({
                data: [],
                meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
              });
            }
          }
        }

        const effectiveOp = opData ?? initialOperation;
        const reportId = numericResult(effectiveOp?.result, "profile_validation_report_id");
        if (reportId !== null) {
          try {
            const validationReport = await getProfileValidationReport(reportId);
            if (isMounted) setReport(validationReport);
          } catch {
            // report failed to load
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Erro ao carregar detalhes da execução.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [open, initialOperation, initialRun]);

  const isValidation = operation?.type === "profile_validation";
  const href = isValidation
    ? `/admin/crawler/agencies/${agencyId}/crawls/operations/${operation?.id}`
    : run
      ? `/admin/crawler/runs/${run.id}`
      : `/admin/crawler/agencies/${agencyId}/crawls/operations/${operation?.id}`;

  const profileId = report?.extraction_profile_id ?? numericResult(operation?.plan, "extraction_profile_id");
  const validRatioRecommended = report !== null && report.valid_ratio >= 0.8;
  const coverageRecommended =
    report !== null && Object.values(report.required_field_coverage).every((coverage) => coverage >= 0.9);
  const recommended =
    validRatioRecommended && coverageRecommended && (report?.blocking_failures.length ?? 0) === 0;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col sm:max-w-4xl">
        <DialogHeader className="gap-1 border-b pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <DialogTitle className="text-lg">
              {isValidation ? "Crawl de Validação" : run ? `Crawl Run #${run.id}` : "Crawl de Produção"}
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{isValidation ? "Validação" : "Produção"}</Badge>
              {operation && <Badge variant="outline">{stateLabels[operation.state]}</Badge>}
              {run && (
                <Badge
                  variant={
                    run.result_kind === "partial"
                      ? "destructive"
                      : run.quality_rejection
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {run.result_kind === "partial"
                    ? "Resultado parcial · não publicável"
                    : run.quality_rejection
                      ? "Publicação recusada"
                      : run.publication_state}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span>
              {operation ? `Operação #${operation.id}` : ""}
              {operation && run ? " · " : ""}
              {run ? `Execução de produção #${run.id}` : ""}
            </span>
            <Link
              className="text-xs text-muted-foreground underline hover:text-foreground"
              href={href}
              rel="noreferrer"
              target="_blank"
            >
              Abrir em página dedicada
            </Link>
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(90vh-10rem)] space-y-5 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
              <span className="text-base">Carregando detalhes da execução…</span>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!isLoading && (
            <>
              {operation && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Status da Operação</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CrawlerOperationStatus operation={operation} />
                  </CardContent>
                </Card>
              )}

              {isValidation && report && profileId !== null && (
                <Card>
                  <CardHeader className="flex-row items-start justify-between gap-3">
                    <div>
                      <CardTitle>Resultado da validação</CardTitle>
                      <CardDescription>
                        Recomendações técnicas; a decisão humana permanece em Perfis de Extração.
                      </CardDescription>
                    </div>
                    <Badge variant={recommended ? "secondary" : "outline"}>
                      {recommended ? "Dentro da recomendação" : "Fora da recomendação"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-transparent bg-muted p-3">
                        <p className="text-xs text-muted-foreground">Registros válidos</p>
                        <p className="text-lg font-semibold">
                          {report.valid_record_count}/{report.sampled_url_count} ·{" "}
                          {Math.round(report.valid_ratio * 100)}%
                        </p>
                      </div>
                      <div className="rounded-xl border border-transparent bg-muted p-3">
                        <p className="text-xs text-muted-foreground">Cobertura obrigatória</p>
                        <p className="text-lg font-semibold">
                          {coverageRecommended ? "Atendida" : "Abaixo do recomendado"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-transparent bg-muted p-3">
                        <p className="text-xs text-muted-foreground">Falhas Críticas de Validação</p>
                        <p className="text-lg font-semibold">{report.blocking_failures.length}</p>
                      </div>
                    </div>
                    {report.blocking_failures.map((failure) => (
                      <p className="text-sm text-destructive" key={failure}>
                        Falha Crítica de Validação: {failure}
                      </p>
                    ))}
                    {report.warnings.map((warning) => (
                      <p className="text-sm text-warning" key={warning}>
                        {warning}
                      </p>
                    ))}
                    <ProfileEvidenceInspector
                      agencyId={agencyId}
                      profileId={profileId}
                      reportId={report.id}
                      totalRecords={report.sampled_url_count}
                    />
                  </CardContent>
                </Card>
              )}

              {run && (
                <>
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Evidências de qualidade</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <QualityEvaluationPanel initialRun={run} />
                    </CardContent>
                  </Card>

                  <ExceptionalPublicationPanel initialRun={run} key={run.quality_report?.id ?? "pending"} />

                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Dados persistidos</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {recordsPage ? (
                        <CrawlRunDataTable initialPage={recordsPage} runId={run.id} />
                      ) : (
                        <p className="text-sm text-muted-foreground">Nenhum dado persistido encontrado.</p>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button onClick={() => onOpenChange(false)} type="button" variant="outline">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
