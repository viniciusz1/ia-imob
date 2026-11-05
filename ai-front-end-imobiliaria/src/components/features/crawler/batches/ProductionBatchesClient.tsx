"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { Filter, Layers, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { listProductionBatches } from "@/services/productionBatchService";
import type {
  BatchFilters,
  BatchPage,
  ProductionBatch,
} from "@/types/productionBatch";
import { dateRangeError } from "@/components/features/crawler/requiredFields";
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
  // Mirrors the date inputs only to check the range; the submit still reads the form.
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const rangeError = dateRangeError(rangeFrom, rangeTo);
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
    <section className="space-y-6">
      <PageHeader
        actions={
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw className={cn(query.isFetching && "animate-spin")} />
            Atualizar
          </Button>
        }
        description="Histórico dos disparos, resultados de qualidade e diagnóstico das extrações."
        title="Execuções em lote"
      />
      <Card className="py-6 sm:py-8">
        <form
          className="grid gap-4 px-6 sm:grid-cols-2 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
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
          <FormField htmlFor="batch-state" label="Situação">
            <NativeSelect id="batch-state" name="state">
              <option value="">Todas</option>
              {(
                ["queued", "running", "awaiting_quality", "completed"] as const
              ).map((state) => (
                <option key={state} value={state}>
                  {outcomeLabels[state]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField htmlFor="batch-from" label="De">
            <Input id="batch-from" type="date" name="from" onChange={(event) => setRangeFrom(event.target.value)} />
          </FormField>
          <FormField error={rangeError} htmlFor="batch-to" label="Até">
            <Input id="batch-to" type="date" name="to" onChange={(event) => setRangeTo(event.target.value)} />
          </FormField>
          <Button disabled={rangeError !== null} type="submit">
            <Filter />
            Filtrar
          </Button>
        </form>
      </Card>
      {query.isError && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Não foi possível atualizar os lotes. Tente novamente.
        </p>
      )}
      {query.data ? (
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader
            description={`${query.data.meta.total} lote(s) registrados.`}
            icon={Layers}
            title="Lotes disparados"
          />
          <Table>
            <caption className="sr-only">Histórico de execuções em lote</caption>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
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
                  <TableHead key={title}>{title}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.data.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>
                    <Link
                      className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                      href={`/admin/crawler/batches/${batch.id}`}
                    >
                      Lote #{batch.id}
                    </Link>
                    <p className="text-[0.8125rem] text-subtle">
                      {batch.requester.name}
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {dateTime(batch.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={batchBadgeVariant(batch)}>
                      {batch.state === "completed"
                        ? resultLabels[batch.result]
                        : outcomeLabels[batch.state]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {batch.counts.requested ?? "Não registrado"}
                    <p className="text-[0.8125rem] text-subtle">
                      {batch.counts.skipped ?? "?"} ignorada(s)
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {batch.counts.technical_succeeded} /{" "}
                    {batch.counts.enqueued}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {batch.counts.published}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    <span
                      className={cn(
                        batch.counts.failed > 0 && "font-medium text-destructive",
                      )}
                    >
                      {batch.counts.failed} falha(s)
                    </span>
                    <p className="text-[0.8125rem] text-subtle">
                      {batch.counts.quarantined} em quarentena ·{" "}
                      {batch.counts.cancelled} cancelado(s)
                    </p>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {duration(batch.created_at, batch.completed_at)}
                  </TableCell>
                </TableRow>
              ))}
              {query.data.data.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Nenhum lote encontrado.
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
      ) : (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          Carregando lotes…
        </p>
      )}
    </section>
  );
}

/** Tone of the state/result chip, from the batch result once it has one. */
function batchBadgeVariant(
  batch: ProductionBatch,
): "success" | "warning" | "destructive" | "info" | "muted" {
  if (batch.state !== "completed") {
    return batch.state === "awaiting_quality" ? "warning" : batch.state === "running" ? "info" : "muted";
  }
  return resultBadgeVariants[batch.result];
}

const resultBadgeVariants: Record<
  ProductionBatch["result"],
  "success" | "warning" | "destructive" | "info" | "muted"
> = {
  succeeded: "success",
  partial: "warning",
  failed: "destructive",
  in_progress: "info",
  not_executed: "muted",
};
