"use client";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Building2, Layers, RefreshCw, RotateCcw, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
      <PageHeader
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                void batchQuery.refetch();
                void itemsQuery.refetch();
              }}
              disabled={batchQuery.isFetching}
            >
              <RefreshCw className={cn(batchQuery.isFetching && "animate-spin")} />
              Atualizar
            </Button>
            {canExecute && problems > 0 && (
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogTrigger asChild>
                  <Button>
                    <RotateCcw />
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
          </>
        }
        backHref="/admin/crawler/batches"
        badge={
          <Badge variant={batchStateVariant(batch)}>
            {batch.state === "completed"
              ? resultLabels[batch.result]
              : outcomeLabels[batch.state]}
          </Badge>
        }
        description={
          <>
            {batch.name}
            <span className="mt-1 block text-[0.8125rem] font-normal">
              Solicitado por {batch.requester.name} em{" "}
              {dateTime(batch.created_at)} · Duração:{" "}
              {duration(batch.created_at, batch.completed_at)}
            </span>
          </>
        }
        title={`Lote #${batch.id}`}
      />
      {batch.source_group_id !== null && (
        <p className="flex items-center gap-2 rounded-xl bg-info/10 px-4 py-3 text-sm text-foreground">
          <RotateCcw className="size-4 text-info" />
          Reexecução do{" "}
          <Link
            className="font-medium text-info underline-offset-4 hover:underline"
            href={`/admin/crawler/batches/${batch.source_group_id}`}
          >
            lote #{batch.source_group_id}
          </Link>
          .
        </p>
      )}
      {batch.historical_incomplete && (
        <p className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          Lote histórico: total solicitado e agências ignoradas não foram
          registrados. Os nomes disponíveis correspondem ao cadastro recuperado
          na migração.
        </p>
      )}
      {(batchQuery.isError || itemsQuery.isError) && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Não foi possível atualizar o lote. Os últimos dados disponíveis foram
          preservados.
        </p>
      )}
      <Card className="gap-0 py-0">
        <SectionHeader
          description="Contagem das agências do lote em cada etapa."
          icon={Layers}
          title="Resumo do lote"
        />
        <div className="space-y-5 px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {metrics.map(([label, value]) => (
              <div className="rounded-xl bg-muted p-4" key={label}>
                <p className="text-[0.8125rem] leading-4 font-semibold text-subtle">
                  {label}
                </p>
                <p className="mt-2 text-2xl leading-8 font-semibold text-foreground tabular-nums">
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2.5 rounded-xl bg-muted p-4">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-medium text-foreground">
                {batch.state === "completed"
                  ? "Processamento encerrado"
                  : outcomeLabels[batch.state]}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {batch.progress_percentage !== null
                  ? `${batch.progress_percentage}% resolvido`
                  : "Sem execuções"}
              </span>
            </div>
            {batch.progress_percentage !== null && (
              <Progress
                aria-label="Progresso do lote"
                value={batch.progress_percentage}
              />
            )}
            <p className="text-[0.8125rem] text-subtle">
              {counts.queued} na fila · {counts.running} em execução ·{" "}
              {counts.awaiting_quality} aguardando qualidade. O término técnico do
              worker não significa publicação.
            </p>
          </div>
        </div>
      </Card>
      <section aria-label="Agências do lote">
        <Card className="gap-0 overflow-hidden py-0">
          <SectionHeader
            as="h2"
            description="Resultado de cada agência, com diagnóstico e evidências."
            icon={Building2}
            title="Agências do lote"
          />
          <form
            className="flex flex-col gap-3 px-6 pb-6 sm:flex-row sm:items-center sm:px-8"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              setFilters({
                search: String(data.get("search") || ""),
                outcome: String(data.get("outcome") || ""),
              });
            }}
          >
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-10"
                name="search"
                placeholder="Nome ou domínio"
                aria-label="Filtrar agências do lote"
              />
            </div>
            <NativeSelect
              name="outcome"
              aria-label="Filtrar resultado"
              wrapperClassName="sm:w-60"
            >
              <option value="">Todos os resultados</option>
              {Object.entries(outcomeLabels)
                .filter(([key]) => key !== "completed")
                .map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
            </NativeSelect>
            <Button type="submit">
              <Search />
              Buscar
            </Button>
          </form>
          {itemsQuery.data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    {[
                      "Selecionar",
                      "Agência",
                      "Resultado",
                      "Etapa / URLs",
                      "Registros",
                      "Diagnóstico / evidências",
                    ].map((title) => (
                      <TableHead key={title}>{title}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsQuery.data.data.map((item) => (
                    <TableRow className="align-top" key={item.id}>
                      <TableCell className="align-top">
                        {canExecute && problemOutcomes.has(item.outcome) && (
                          <input
                            type="checkbox"
                            className="size-4 cursor-pointer accent-primary"
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
                      </TableCell>
                      <TableCell className="min-w-44 align-top">
                        <Link
                          className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                          href={`/admin/crawler/agencies/${item.crawl_agency_id}`}
                        >
                          {item.name}
                        </Link>
                        <p className="text-[0.8125rem] text-subtle">
                          {item.root_domain}
                        </p>
                      </TableCell>
                      <TableCell className="align-top whitespace-normal">
                        <Badge variant={itemOutcomeVariant(item.outcome)}>
                          {outcomeLabels[item.outcome]}
                        </Badge>
                        {item.quality_verdict === "blocked" &&
                          item.publication_state === "published" && (
                            <p className="mt-1.5 max-w-48 text-[0.8125rem] leading-4 text-subtle">
                              Publicado excepcionalmente depois da quarentena.
                            </p>
                          )}
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-foreground">
                          {item.stage
                            ? (stageLabels[item.stage] ?? item.stage)
                            : "—"}
                        </p>
                        <p className="text-[0.8125rem] text-subtle tabular-nums">
                          {item.processed_items ?? 0} /{" "}
                          {item.total_items ?? "?"} URLs
                        </p>
                        {item.technical_state === "running" && (
                          <p className="text-[0.8125rem] text-subtle">
                            Heartbeat: {dateTime(item.heartbeat_at)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="align-top tabular-nums">
                        <p className="text-foreground">
                          {item.normalized_count ?? 0} válidos
                        </p>
                        <p className="text-[0.8125rem] text-subtle">
                          {item.raw_count ?? 0} brutos ·{" "}
                          {item.rejected_count ?? 0} rejeitados
                        </p>
                      </TableCell>
                      <TableCell className="max-w-sm align-top whitespace-normal">
                        <p className="break-words text-foreground">
                          {item.skip_message ??
                            (item.attention_code === "missing_crawl_run"
                              ? "Worker concluiu sem resultado persistido. Requer investigação."
                              : null) ??
                            item.error_message ??
                            item.blockers.join(", ")}
                        </p>
                        <p className="text-[0.8125rem] text-subtle">
                          {item.skip_code ?? item.error_code}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          {item.operation_id && (
                            <Link
                              className="text-[0.8125rem] font-medium text-primary underline-offset-4 hover:underline"
                              href={`/admin/crawler/agencies/${item.crawl_agency_id}/crawls/operations/${item.operation_id}`}
                            >
                              Operação #{item.operation_id}
                            </Link>
                          )}
                          {item.crawl_run_id && (
                            <Link
                              className="text-[0.8125rem] font-medium text-primary underline-offset-4 hover:underline"
                              href={`/admin/crawler/runs/${item.crawl_run_id}`}
                            >
                              Snapshot #{item.crawl_run_id}
                            </Link>
                          )}
                        </div>
                        {item.extraction_profile_id && (
                          <p className="mt-1 text-[0.8125rem] text-subtle">
                            Perfil #{item.extraction_profile_id} · Contrato #
                            {item.market_data_contract_version_id} · Qualidade #
                            {item.quality_policy_version_id}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {itemsQuery.data.data.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={6}
                        className="h-20 text-center text-muted-foreground"
                      >
                        Nenhuma agência neste filtro.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <BatchPagination
                meta={itemsQuery.data.meta}
                pending={itemsQuery.isFetching}
                onPage={(page) => setFilters({ ...filters, page })}
              />
            </>
          )}
        </Card>
      </section>
      <ProductionBatchDiagnostics
        batchId={batch.id}
        initialPage={initialDiagnostics}
        interval={interval}
      />
    </section>
  );
}

type ChipVariant = "success" | "warning" | "destructive" | "info" | "muted";

/** Tone of the batch chip: by result once completed, by state while running. */
function batchStateVariant(batch: ProductionBatch): ChipVariant {
  if (batch.state !== "completed") {
    return batch.state === "awaiting_quality" ? "warning" : batch.state === "running" ? "info" : "muted";
  }
  const byResult: Record<ProductionBatch["result"], ChipVariant> = {
    succeeded: "success",
    partial: "warning",
    failed: "destructive",
    in_progress: "info",
    not_executed: "muted",
  };
  return byResult[batch.result];
}

/** Problem outcomes stay red as before; the others get their own tone. */
function itemOutcomeVariant(outcome: ProductionBatchItem["outcome"]): ChipVariant {
  if (problemOutcomes.has(outcome)) return "destructive";
  if (outcome === "published") return "success";
  if (outcome === "running") return "info";
  if (outcome === "awaiting_quality") return "warning";
  return "muted";
}
