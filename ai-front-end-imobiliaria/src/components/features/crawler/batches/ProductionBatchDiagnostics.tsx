"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    <section aria-label="Diagnóstico de extração" className="space-y-4">
      <h2 className="text-lg font-semibold">Diagnóstico de extração</h2>
      <form
        className="flex flex-wrap items-end gap-2"
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
        <label className="text-sm">
          Etapa
          <Input name="stage" placeholder="extraction" />
        </label>
        <label className="text-sm">
          Estratégia
          <Input name="strategy" placeholder="css" />
        </label>
        <label className="text-sm">
          Campo
          <Input name="field" placeholder="valor" />
        </label>
        <label className="text-sm">
          Código de erro
          <Input name="error_code" />
        </label>
        <label className="text-sm">
          Operação
          <Input name="operation_id" type="number" min={1} />
        </label>
        <Button type="submit" variant="outline">
          Filtrar diagnóstico
        </Button>
      </form>
      {query.isError && (
        <p role="alert">Não foi possível carregar o diagnóstico.</p>
      )}
      {query.data && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Causas recorrentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {query.data.summary.errors.length === 0 && (
                  <p className="text-muted-foreground">
                    Nenhuma falha registrada neste filtro.
                  </p>
                )}
                {query.data.summary.errors.map((error) => (
                  <div
                    key={`${error.stage}-${error.strategy}-${error.error_code}`}
                  >
                    <p className="break-words font-medium">
                      {error.error_code}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {stageLabels[error.stage] ?? error.stage} ·{" "}
                      {error.strategy ?? "—"} · {error.occurrences}{" "}
                      ocorrência(s), {error.affected_operations} operação(ões)
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Estratégias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {query.data.summary.strategies.length === 0 && (
                  <p className="text-muted-foreground">
                    Tentativas ainda não registradas.
                  </p>
                )}
                {query.data.summary.strategies.map((strategy) => (
                  <div key={strategy.strategy}>
                    <p className="font-medium">{strategy.strategy}</p>
                    <p>
                      {strategy.attempts} tentativa(s) · {strategy.failed}{" "}
                      falha(s)
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {strategy.fallback_contributions} contribuição(ões) por
                      fallback · {(strategy.duration_ms / 1000).toFixed(1)}s
                      acumulados
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Cobertura por campo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  Inclui URLs rejeitadas. Presença do campo não comprova sua
                  exatidão.
                </p>
                {query.data.summary.fields.map((field) => (
                  <div key={field.name}>
                    <div className="flex justify-between gap-3">
                      <span>{field.name}</span>
                      <span>
                        {field.present} / {field.processed}
                      </span>
                    </div>
                    <progress
                      className="h-1.5 w-full accent-primary"
                      aria-label={`Cobertura de ${field.name}`}
                      max={Math.max(1, field.processed)}
                      value={field.present}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Evidências por URL e estratégia
              </caption>
              <thead className="bg-muted/40">
                <tr>
                  {[
                    "Quando / operação",
                    "URL e etapa",
                    "Resultado",
                    "Evidência",
                  ].map((title) => (
                    <th className="p-3" key={title}>
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((event) => (
                  <tr
                    className="border-t align-top"
                    key={`${event.event_id}-${event.created_at}`}
                  >
                    <td className="whitespace-nowrap p-3">
                      {dateTime(event.created_at)}
                      <p>Operação #{event.operation_id}</p>
                    </td>
                    <td className="max-w-md break-all p-3">
                      {event.url ?? "Execução"}
                      <p className="text-xs text-muted-foreground">
                        {stageLabels[event.stage] ?? event.stage} ·{" "}
                        {event.strategy ?? "—"}
                        {event.fallback ? " · fallback" : ""}
                      </p>
                    </td>
                    <td className="p-3">
                      {event.outcome}
                      <p className="text-xs text-muted-foreground">
                        {event.duration_ms}ms
                      </p>
                    </td>
                    <td className="max-w-md break-words p-3">
                      <p className="font-medium">{event.error_code}</p>
                      <p>{event.message}</p>
                      {event.fields_present.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Campos presentes: {event.fields_present.join(", ")}
                        </p>
                      )}
                      {event.fields_missing.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Ausentes: {event.fields_missing.join(", ")}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
                {query.data.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-muted-foreground"
                    >
                      Nenhuma evidência registrada. Lotes antigos ou workers
                      anteriores podem não ter diagnóstico detalhado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <BatchPagination
            meta={query.data.meta}
            pending={query.isFetching}
            onPage={(page) => setFilters({ ...filters, page })}
          />
          <p className="text-xs text-muted-foreground">
            Os dados brutos, normalizados e rejeitados estão disponíveis nos
            links de snapshot de cada agência.
          </p>
          <Link className="text-sm underline" href="/admin/crawler/quality">
            Abrir revisão de qualidade
          </Link>
        </>
      )}
    </section>
  );
}
