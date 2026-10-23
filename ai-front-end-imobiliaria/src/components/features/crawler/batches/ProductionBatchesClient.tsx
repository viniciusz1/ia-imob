"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { listProductionBatches } from "@/services/productionBatchService";
import type {
  BatchFilters,
  BatchPage,
  ProductionBatch,
} from "@/types/productionBatch";
import { BatchPagination } from "./BatchPagination";
import {
  dateTime,
  duration,
  outcomeLabels,
  resultLabels,
} from "./batchPresentation";
import { useBatchPollInterval } from "./useBatchPollInterval";
export function ProductionBatchesClient({
  initialPage,
}: {
  initialPage: BatchPage<ProductionBatch>;
}) {
  const [filters, setFilters] = useState<BatchFilters>({});
  const interval = useBatchPollInterval();
  const query = useQuery({
    queryKey: ["production-batches", filters],
    queryFn: () => listProductionBatches(filters),
    initialData: Object.keys(filters).length === 0 ? initialPage : undefined,
    staleTime: 5_000,
    refetchIntervalInBackground: true,
    refetchInterval: (query) =>
      query.state.data?.data.some((batch) => batch.state !== "completed")
        ? interval
        : false,
  });
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Execuções em lote</h1>
          <p className="text-sm text-muted-foreground">
            Histórico dos disparos, resultados de qualidade e diagnóstico das
            extrações.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Atualizar
        </Button>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setFilters({
            state: String(data.get("state") || ""),
            from: data.get("from")
              ? `${String(data.get("from"))}T00:00:00-03:00`
              : "",
            to: data.get("to")
              ? `${String(data.get("to"))}T23:59:59.999-03:00`
              : "",
          });
        }}
      >
        <label className="space-y-1 text-sm">
          Situação
          <select
            name="state"
            className="block h-9 rounded-md border bg-background px-3"
          >
            <option value="">Todas</option>
            {(
              ["queued", "running", "awaiting_quality", "completed"] as const
            ).map((state) => (
              <option key={state} value={state}>
                {outcomeLabels[state]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          De
          <Input type="date" name="from" />
        </label>
        <label className="space-y-1 text-sm">
          Até
          <Input type="date" name="to" />
        </label>
        <Button type="submit">Filtrar</Button>
      </form>
      {query.isError && (
        <p role="alert">
          Não foi possível atualizar os lotes. Tente novamente.
        </p>
      )}
      {query.data ? (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Histórico de execuções em lote
              </caption>
              <thead className="bg-muted/40">
                <tr>
                  {[
                    "Lote / responsável",
                    "Solicitado em",
                    "Situação",
                    "Agências",
                    "Sucesso técnico",
                    "Publicados",
                    "Problemas",
                    "Duração",
                  ].map((title) => (
                    <th
                      className="whitespace-nowrap p-3 font-medium"
                      key={title}
                    >
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.data.map((batch) => (
                  <tr className="border-t align-top" key={batch.id}>
                    <td className="p-3">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/admin/crawler/batches/${batch.id}`}
                      >
                        Lote #{batch.id}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {batch.requester.name}
                      </p>
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {dateTime(batch.created_at)}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">
                        {batch.state === "completed"
                          ? resultLabels[batch.result]
                          : outcomeLabels[batch.state]}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {batch.counts.requested ?? "Não registrado"}
                      <p className="text-xs text-muted-foreground">
                        {batch.counts.skipped ?? "?"} ignorada(s)
                      </p>
                    </td>
                    <td className="p-3">
                      {batch.counts.technical_succeeded} /{" "}
                      {batch.counts.enqueued}
                    </td>
                    <td className="p-3">{batch.counts.published}</td>
                    <td className="p-3">
                      <span>{batch.counts.failed} falha(s)</span>
                      <p className="text-xs text-muted-foreground">
                        {batch.counts.quarantined} em quarentena ·{" "}
                        {batch.counts.cancelled} cancelado(s)
                      </p>
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {duration(batch.created_at, batch.completed_at)}
                    </td>
                  </tr>
                ))}
                {query.data.data.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-muted-foreground"
                    >
                      Nenhum lote encontrado.
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
        </>
      ) : (
        <p role="status">Carregando lotes…</p>
      )}
    </section>
  );
}
