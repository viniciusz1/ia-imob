"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePermission } from "@/hooks/usePermission";
import {
  getProductionBatch,
  listProductionBatchItems,
  rerunProductionBatch,
} from "@/services/productionBatchService";
import type {
  BatchDiagnosticsPage,
  BatchItemFilters,
  BatchPage,
  ProductionBatch,
  ProductionBatchItem,
} from "@/types/productionBatch";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";
import { BatchPagination } from "./BatchPagination";
import {
  dateTime,
  duration,
  outcomeLabels,
  resultLabels,
  stageLabels,
} from "./batchPresentation";
import { ProductionBatchDiagnostics } from "./ProductionBatchDiagnostics";
import { useBatchPollInterval } from "./useBatchPollInterval";
const problemOutcomes = new Set(["failed", "cancelled", "quarantined"]);
export function ProductionBatchDetail({
  initialBatch,
  initialItems,
  initialDiagnostics,
}: {
  initialBatch: ProductionBatch;
  initialItems: BatchPage<ProductionBatchItem>;
  initialDiagnostics: BatchDiagnosticsPage;
}) {
  const router = useRouter();
  const canExecute = usePermission("crawler.operations.execute");
  const pollInterval = useBatchPollInterval();
  const batchQuery = useQuery({
    queryKey: ["production-batch", initialBatch.id],
    queryFn: () => getProductionBatch(initialBatch.id),
    initialData: initialBatch,
    staleTime: 5_000,
    refetchIntervalInBackground: true,
    refetchInterval: (query) =>
      query.state.data?.state === "completed" ? false : pollInterval,
  });
  const batch = batchQuery.data;
  const interval = batch.state === "completed" ? false : pollInterval;
  const [filters, setFilters] = useState<BatchItemFilters>({});
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const requestKey = useRef<string | null>(null);
  const itemsQuery = useQuery({
    queryKey: ["production-batch-items", batch.id, filters],
    queryFn: () => listProductionBatchItems(batch.id, filters),
    initialData: Object.keys(filters).length === 0 ? initialItems : undefined,
    staleTime: 5_000,
    refetchInterval: interval,
    refetchIntervalInBackground: true,
  });
  const rerun = useMutation({
    mutationFn: () => {
      requestKey.current ??= crypto.randomUUID();
      return rerunProductionBatch(batch.id, {
        confirmed: true,
        request_key: requestKey.current,
        ...(selected.length > 0 ? { item_ids: selected } : {}),
      });
    },
    onSuccess: (result) => {
      requestKey.current = null;
      setConfirmOpen(false);
      router.push(`/admin/crawler/batches/${result.batch.id}`);
    },
  });
  const counts = batch.counts;
  const problems = counts.failed + counts.quarantined + counts.cancelled;
  const metrics = [
    ["Solicitadas", counts.requested],
    ["Enfileiradas", counts.enqueued],
    ["Sucesso técnico", counts.technical_succeeded],
    ["Publicados", counts.published],
    ["Falhas técnicas", counts.failed],
    ["Quarentena", counts.quarantined],
    ["Cancelados", counts.cancelled],
    ["Ignoradas", counts.skipped],
  ] as const;
  return (
    <section className="space-y-6">
      <Link className="text-sm underline" href="/admin/crawler/batches">
        Voltar para execuções em lote
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Lote #{batch.id}</h1>
          <p className="text-muted-foreground">{batch.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Solicitado por {batch.requester.name} em{" "}
            {dateTime(batch.created_at)} · Duração:{" "}
            {duration(batch.started_at, batch.completed_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {batch.state === "completed"
              ? resultLabels[batch.result]
              : outcomeLabels[batch.state]}
          </Badge>
          <Button
            variant="outline"
            onClick={() => {
              void batchQuery.refetch();
              void itemsQuery.refetch();
            }}
            disabled={batchQuery.isFetching}
          >
            Atualizar
          </Button>
          {canExecute && problems > 0 && (
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button>
                  Reexecutar{" "}
                  {selected.length > 0
                    ? `${selected.length} selecionada(s)`
                    : "problemas"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Reexecutar agências com problemas?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Será criado outro lote com Discovery novo e as configurações
                    atualmente ativas. Agências bloqueadas serão registradas
                    como ignoradas no novo lote.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {rerun.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {crawlerOperationErrorMessage(
                      rerun.error,
                      "Não foi possível iniciar a reexecução.",
                    )}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={rerun.isPending}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    disabled={rerun.isPending}
                    onClick={(event) => {
                      event.preventDefault();
                      rerun.mutate();
                    }}
                  >
                    {rerun.isPending ? "Enfileirando…" : "Confirmar reexecução"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {batch.source_group_id !== null && (
        <p className="text-sm">
          Reexecução do{" "}
          <Link
            className="underline"
            href={`/admin/crawler/batches/${batch.source_group_id}`}
          >
            lote #{batch.source_group_id}
          </Link>
          .
        </p>
      )}
      {batch.historical_incomplete && (
        <p className="rounded-md border p-3 text-sm">
          Lote histórico: total solicitado e agências ignoradas não foram
          registrados. Os nomes disponíveis correspondem ao cadastro recuperado
          na migração.
        </p>
      )}
      {(batchQuery.isError || itemsQuery.isError) && (
        <p role="alert">
          Não foi possível atualizar o lote. Os últimos dados disponíveis foram
          preservados.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {value ?? "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-2 rounded-lg border p-4">
        <div className="flex justify-between text-sm">
          <span>
            {batch.state === "completed"
              ? "Processamento encerrado"
              : outcomeLabels[batch.state]}
          </span>
          <span>
            {batch.progress_percentage !== null
              ? `${batch.progress_percentage}% resolvido`
              : "Sem execuções"}
          </span>
        </div>
        {batch.progress_percentage !== null && (
          <progress
            className="h-2 w-full accent-primary"
            max={100}
            value={batch.progress_percentage}
            aria-label="Progresso do lote"
          />
        )}
        <p className="text-xs text-muted-foreground">
          {counts.queued} na fila · {counts.running} em execução ·{" "}
          {counts.awaiting_quality} aguardando qualidade. O término técnico do
          worker não significa publicação.
        </p>
      </div>
      <section className="space-y-3" aria-label="Agências do lote">
        <h2 className="text-lg font-semibold">Agências do lote</h2>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setFilters({
              search: String(data.get("search") || ""),
              outcome: String(data.get("outcome") || ""),
            });
          }}
        >
          <Input
            className="max-w-sm"
            name="search"
            placeholder="Nome ou domínio"
            aria-label="Filtrar agências do lote"
          />
          <select
            className="rounded-md border bg-background px-3 text-sm"
            name="outcome"
            aria-label="Filtrar resultado"
          >
            <option value="">Todos os resultados</option>
            {Object.entries(outcomeLabels)
              .filter(([key]) => key !== "completed")
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
        {itemsQuery.data && (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      "Selecionar",
                      "Agência",
                      "Resultado",
                      "Etapa / URLs",
                      "Registros",
                      "Diagnóstico / evidências",
                    ].map((title) => (
                      <th className="p-3" key={title}>
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itemsQuery.data.data.map((item) => (
                    <tr className="border-t align-top" key={item.id}>
                      <td className="p-3">
                        {canExecute && problemOutcomes.has(item.outcome) && (
                          <input
                            type="checkbox"
                            aria-label={`Selecionar ${item.name}`}
                            checked={selected.includes(item.id)}
                            onChange={(event) => {
                              requestKey.current = null;
                              setSelected(
                                event.target.checked
                                  ? [...selected, item.id]
                                  : selected.filter((id) => id !== item.id),
                              );
                            }}
                          />
                        )}
                      </td>
                      <td className="min-w-44 p-3">
                        <Link
                          className="font-medium underline-offset-4 hover:underline"
                          href={`/admin/crawler/agencies/${item.crawl_agency_id}`}
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {item.root_domain}
                        </p>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            problemOutcomes.has(item.outcome)
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {outcomeLabels[item.outcome]}
                        </Badge>
                        {item.quality_verdict === "blocked" &&
                          item.publication_state === "published" && (
                            <p className="mt-1 text-xs">
                              Publicado excepcionalmente depois da quarentena.
                            </p>
                          )}
                      </td>
                      <td className="p-3">
                        <p>
                          {item.stage
                            ? (stageLabels[item.stage] ?? item.stage)
                            : "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.processed_items ?? 0} /{" "}
                          {item.total_items ?? "?"} URLs
                        </p>
                        {item.technical_state === "running" && (
                          <p className="text-xs text-muted-foreground">
                            Heartbeat: {dateTime(item.heartbeat_at)}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        <p>{item.normalized_count ?? 0} válidos</p>
                        <p className="text-xs text-muted-foreground">
                          {item.raw_count ?? 0} brutos ·{" "}
                          {item.rejected_count ?? 0} rejeitados
                        </p>
                      </td>
                      <td className="max-w-sm p-3">
                        <p className="break-words">
                          {item.skip_message ??
                            item.error_message ??
                            item.blockers.join(", ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.skip_code ?? item.error_code}
                        </p>
                        {item.operation_id && (
                          <Link
                            className="mr-3 inline-block text-xs underline"
                            href={`/admin/crawler/agencies/${item.crawl_agency_id}/crawls/operations/${item.operation_id}`}
                          >
                            Operação #{item.operation_id}
                          </Link>
                        )}
                        {item.crawl_run_id && (
                          <Link
                            className="inline-block text-xs underline"
                            href={`/admin/crawler/runs/${item.crawl_run_id}`}
                          >
                            Snapshot #{item.crawl_run_id}
                          </Link>
                        )}
                        {item.extraction_profile_id && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Perfil #{item.extraction_profile_id} · Contrato #
                            {item.market_data_contract_version_id} · Qualidade #
                            {item.quality_policy_version_id}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                  {itemsQuery.data.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Nenhuma agência neste filtro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <BatchPagination
              meta={itemsQuery.data.meta}
              pending={itemsQuery.isFetching}
              onPage={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </section>
      <ProductionBatchDiagnostics
        batchId={batch.id}
        initialPage={initialDiagnostics}
        interval={interval}
      />
    </section>
  );
}
