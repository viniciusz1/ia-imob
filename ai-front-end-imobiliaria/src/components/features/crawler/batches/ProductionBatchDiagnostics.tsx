"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  CircleAlert,
  FileSearch,
  Filter,
  ListChecks,
  Stethoscope,
  Workflow,
} from "lucide-react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getBatchDiagnostics } from "@/services/productionBatchService";
import type {
  BatchDiagnosticFilters,
  BatchDiagnosticsPage,
} from "@/types/productionBatch";
import { BatchPagination } from "./BatchPagination";
import { dateTime, stageLabels } from "./batchPresentation";
export function ProductionBatchDiagnostics({
  batchId,
  initialPage,
  interval,
}: {
  batchId: number;
  initialPage: BatchDiagnosticsPage;
  interval: number | false;
}) {
  const [filters, setFilters] = useState<BatchDiagnosticFilters>({});
  const query = useQuery({
    queryKey: ["batch-diagnostics", batchId, filters],
    queryFn: () => getBatchDiagnostics(batchId, filters),
    initialData: Object.keys(filters).length === 0 ? initialPage : undefined,
    staleTime: 5_000,
    refetchInterval: interval,
    refetchIntervalInBackground: true,
  });
  return (
    <section aria-label="Diagnóstico de extração" className="space-y-6">
      <Card className="gap-0 py-0">
        <SectionHeader
          as="h2"
          description="Falhas, estratégias e cobertura de campos registradas pelo worker."
          icon={Stethoscope}
          title="Diagnóstico de extração"
        />
        <form
          className="grid gap-4 px-6 pb-6 sm:grid-cols-2 sm:px-8 sm:pb-8 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setFilters({
              stage: String(data.get("stage") || ""),
              strategy: String(data.get("strategy") || ""),
              field: String(data.get("field") || ""),
              error_code: String(data.get("error_code") || ""),
              ...(data.get("operation_id")
                ? { operation_id: Number(data.get("operation_id")) }
                : {}),
            });
          }}
        >
          <FormField htmlFor="diagnostic-stage" label="Etapa">
            <Input id="diagnostic-stage" name="stage" placeholder="extraction" />
          </FormField>
          <FormField htmlFor="diagnostic-strategy" label="Estratégia">
            <Input id="diagnostic-strategy" name="strategy" placeholder="css" />
          </FormField>
          <FormField htmlFor="diagnostic-field" label="Campo">
            <Input id="diagnostic-field" name="field" placeholder="valor" />
          </FormField>
          <FormField htmlFor="diagnostic-error" label="Código de erro">
            <Input id="diagnostic-error" name="error_code" />
          </FormField>
          <FormField htmlFor="diagnostic-operation" label="Operação">
            <Input id="diagnostic-operation" name="operation_id" type="number" min={1} />
          </FormField>
          <Button type="submit">
            <Filter />
            Filtrar diagnóstico
          </Button>
        </form>
      </Card>
      {query.isError && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Não foi possível carregar o diagnóstico.
        </p>
      )}
      {query.data && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="gap-0 py-0">
              <SectionHeader as="h3" icon={CircleAlert} title="Causas recorrentes" />
              <div className="space-y-2 px-6 pb-6 sm:px-8 sm:pb-8">
                {query.data.summary.errors.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma falha registrada neste filtro.
                  </p>
                )}
                {query.data.summary.errors.map((error) => (
                  <div
                    className="rounded-xl bg-muted p-3.5"
                    key={`${error.stage}-${error.strategy}-${error.error_code}`}
                  >
                    <p className="break-words text-sm font-medium text-foreground">
                      {error.error_code}
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-subtle">
                      {stageLabels[error.stage] ?? error.stage} ·{" "}
                      {error.strategy ?? "—"} · {error.occurrences}{" "}
                      ocorrência(s), {error.affected_operations} operação(ões)
                    </p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="gap-0 py-0">
              <SectionHeader as="h3" icon={Workflow} title="Estratégias" />
              <div className="space-y-2 px-6 pb-6 sm:px-8 sm:pb-8">
                {query.data.summary.strategies.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Tentativas ainda não registradas.
                  </p>
                )}
                {query.data.summary.strategies.map((strategy) => (
                  <div className="rounded-xl bg-muted p-3.5" key={strategy.strategy}>
                    <p className="text-sm font-medium text-foreground">{strategy.strategy}</p>
                    <p className="text-sm text-foreground/85">
                      {strategy.attempts} tentativa(s) · {strategy.failed}{" "}
                      falha(s)
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-subtle">
                      {strategy.fallback_contributions} contribuição(ões) por
                      fallback · {(strategy.duration_ms / 1000).toFixed(1)}s
                      acumulados
                    </p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="gap-0 py-0">
              <SectionHeader
                as="h3"
                description="Inclui URLs rejeitadas. Presença do campo não comprova sua exatidão."
                icon={ListChecks}
                title="Cobertura por campo"
              />
              <div className="space-y-3.5 px-6 pb-6 sm:px-8 sm:pb-8">
                {query.data.summary.fields.map((field) => (
                  <div className="space-y-1.5" key={field.name}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-foreground">{field.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {field.present} / {field.processed}
                      </span>
                    </div>
                    <Progress
                      aria-label={`Cobertura de ${field.name}`}
                      value={(field.present / Math.max(1, field.processed)) * 100}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card className="gap-0 overflow-hidden py-0">
            <SectionHeader
              as="h3"
              description="Os dados brutos, normalizados e rejeitados estão disponíveis nos links de snapshot de cada agência."
              href="/admin/crawler/quality"
              icon={FileSearch}
              linkLabel="Abrir revisão de qualidade"
              title="Evidências por URL"
            />
            <Table>
              <caption className="sr-only">Evidências por URL e estratégia</caption>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {[
                    "Quando / operação",
                    "URL e etapa",
                    "Resultado",
                    "Evidência",
                  ].map((title) => (
                    <TableHead key={title}>{title}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.data.map((event) => (
                  <TableRow
                    className="align-top"
                    key={`${event.event_id}-${event.created_at}`}
                  >
                    <TableCell className="align-top tabular-nums">
                      {dateTime(event.created_at)}
                      <p className="text-[0.8125rem] text-subtle">
                        Operação #{event.operation_id}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-md align-top break-all whitespace-normal">
                      <span className="text-foreground">{event.url ?? "Execução"}</span>
                      <p className="text-[0.8125rem] text-subtle">
                        {stageLabels[event.stage] ?? event.stage} ·{" "}
                        {event.strategy ?? "—"}
                        {event.fallback ? " · fallback" : ""}
                      </p>
                    </TableCell>
                    <TableCell className="align-top">
                      {event.outcome}
                      <p className="text-[0.8125rem] text-subtle tabular-nums">
                        {event.duration_ms}ms
                      </p>
                    </TableCell>
                    <TableCell className="max-w-md align-top break-words whitespace-normal">
                      <p className="font-medium text-foreground">{event.error_code}</p>
                      <p>{event.message}</p>
                      {event.fields_present.length > 0 && (
                        <p className="text-[0.8125rem] text-subtle">
                          Campos presentes: {event.fields_present.join(", ")}
                        </p>
                      )}
                      {event.fields_missing.length > 0 && (
                        <p className="text-[0.8125rem] text-subtle">
                          Ausentes: {event.fields_missing.join(", ")}
                        </p>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {query.data.data.length === 0 && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="h-20 text-center whitespace-normal text-muted-foreground"
                    >
                      Nenhuma evidência registrada. Lotes antigos ou workers
                      anteriores podem não ter diagnóstico detalhado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <BatchPagination
              meta={query.data.meta}
              pending={query.isFetching}
              onPage={(page) => setFilters({ ...filters, page })}
            />
          </Card>
        </>
      )}
    </section>
  );
}
