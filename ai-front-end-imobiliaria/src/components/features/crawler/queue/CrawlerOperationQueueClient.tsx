"use client";
import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePermission } from "@/hooks/usePermission";
import {
  cancelCrawlerOperation,
  getCrawlerOperationQueue,
} from "@/services/crawlerService";
import type {
  CrawlerOperation,
  CrawlerOperationQueue,
  CrawlerOperationQueueEntry,
} from "@/types/crawler";
import { BatchPagination } from "../batches/BatchPagination";
import { dateTime, duration, stageLabels } from "../batches/batchPresentation";
import { useBatchPollInterval } from "../batches/useBatchPollInterval";
import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

const typeLabels: Record<string, string> = {
  discovery: "Discovery",
  sample_url_suggestion: "Sugestão de URL de amostra",
  profile_generation: "Geração de Perfil de Extração",
  profile_validation: "Crawl de Validação",
  production_crawl: "Crawl de Produção",
  prospecting: "Prospecção",
};

const operationsWithDetail = ["production_crawl", "profile_validation"];

function OperationCell({ operation }: { operation: CrawlerOperation }) {
  const detailHref =
    operation.crawl_agency_id !== null &&
    operationsWithDetail.includes(operation.type)
      ? `/admin/crawler/agencies/${operation.crawl_agency_id}/crawls/operations/${operation.id}`
      : null;
  return (
    <>
      {detailHref ? (
        <Link
          className="font-medium underline-offset-4 hover:underline"
          href={detailHref}
        >
          #{operation.id}
        </Link>
      ) : (
        <span className="font-medium">#{operation.id}</span>
      )}
      <p className="text-xs text-muted-foreground">
        {typeLabels[operation.type] ?? operation.type}
      </p>
    </>
  );
}

function TargetCell({ operation }: { operation: CrawlerOperation }) {
  if (operation.crawl_agency) {
    return (
      <Link
        className="underline-offset-4 hover:underline"
        href={`/admin/crawler/agencies/${operation.crawl_agency.id}`}
      >
        {operation.crawl_agency.name}
      </Link>
    );
  }
  const { city, state } = operation.plan;
  if (typeof city === "string" && typeof state === "string") {
    return (
      <span>
        {city}/{state}
      </span>
    );
  }
  return <span className="text-muted-foreground">—</span>;
}

function QueueSituation({
  entry,
  isNext,
}: {
  entry: CrawlerOperationQueueEntry;
  isNext: boolean;
}) {
  if (entry.blocked_by_operation_id !== null) {
    return (
      <>
        <Badge variant="outline">
          Aguardando #{entry.blocked_by_operation_id}
        </Badge>
        <p className="mt-1 max-w-64 text-xs text-muted-foreground">
          O worker pula esta operação até o crawl #
          {entry.blocked_by_operation_id} da mesma agência terminar.
        </p>
      </>
    );
  }
  return isNext ? (
    <Badge>Próxima</Badge>
  ) : (
    <span className="text-muted-foreground">Na fila</span>
  );
}

function TableHead({ titles }: { titles: string[] }) {
  return (
    <thead className="bg-muted/40">
      <tr>
        {titles.map((title, index) => (
          <th className="whitespace-nowrap p-3 font-medium" key={index}>
            {title}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function CrawlerOperationQueueClient({
  initialQueue,
}: {
  initialQueue: CrawlerOperationQueue;
}) {
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<CrawlerOperation | null>(null);
  const canCancel = usePermission("crawler.operations.cancel");
  const interval = useBatchPollInterval();
  const query = useQuery({
    queryKey: ["crawler-operation-queue", page],
    queryFn: () => getCrawlerOperationQueue(page),
    initialData: page === 1 ? initialQueue : undefined,
    placeholderData: keepPreviousData,
    staleTime: 5_000,
    refetchInterval: interval,
    refetchIntervalInBackground: true,
  });
  const cancel = useMutation({
    mutationFn: (operation: CrawlerOperation) =>
      cancelCrawlerOperation(operation.id),
    onSuccess: (operation) => {
      toast.success(
        operation.state === "cancelled"
          ? `Operação #${operation.id} removida da fila.`
          : `Cancelamento da operação #${operation.id} solicitado.`,
      );
      setCancelling(null);
      void query.refetch();
    },
    onError: (error) =>
      toast.error(
        crawlerOperationErrorMessage(
          error,
          "Não foi possível cancelar a operação.",
        ),
      ),
  });
  const queue = query.data;
  // The first unblocked entry is what the worker claims next; on later pages
  // it may sit behind blocked entries of page 1, so only page 1 can tell.
  const nextOperationId =
    queue?.meta.current_page === 1
      ? queue.data.find((entry) => entry.blocked_by_operation_id === null)
          ?.operation.id
      : undefined;
  const cancelButton = (operation: CrawlerOperation) =>
    canCancel && (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setCancelling(operation)}
      >
        Cancelar
      </Button>
    );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Fila</h1>
          <p className="text-sm text-muted-foreground">
            O que o worker está executando agora e a ordem em que pegará as
            próximas operações.
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
      {query.isError && (
        <p role="alert">Não foi possível atualizar a fila. Tente novamente.</p>
      )}
      {queue ? (
        <>
          <section aria-labelledby="queue-running" className="space-y-3">
            <h2 className="font-semibold" id="queue-running">
              Em execução agora ({queue.running.length})
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <TableHead
                  titles={[
                    "Operação",
                    "Alvo",
                    "Worker",
                    "Progresso",
                    "Iniciada",
                    ...(canCancel ? [""] : []),
                  ]}
                />
                <tbody>
                  {queue.running.map((operation) => (
                    <tr className="border-t align-top" key={operation.id}>
                      <td className="p-3">
                        <OperationCell operation={operation} />
                      </td>
                      <td className="p-3">
                        <TargetCell operation={operation} />
                      </td>
                      <td className="p-3">
                        {operation.worker?.worker_key ?? "—"}
                        <p className="text-xs text-muted-foreground">
                          Último sinal{" "}
                          {dateTime(operation.progress.heartbeat_at)}
                        </p>
                      </td>
                      <td className="min-w-48 space-y-1 p-3">
                        <Progress value={operation.progress.percentage} />
                        <p className="text-xs text-muted-foreground">
                          {stageLabels[operation.progress.stage] ??
                            operation.progress.stage}{" "}
                          · {operation.progress.percentage}%
                          {operation.progress.total
                            ? ` · ${operation.progress.processed}/${operation.progress.total}`
                            : ""}
                        </p>
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {dateTime(operation.claimed_at ?? null)}
                        <p className="text-xs text-muted-foreground">
                          há {duration(operation.claimed_at ?? null, null)}
                        </p>
                      </td>
                      {canCancel && (
                        <td className="p-3 text-right">
                          {operation.state === "cancellation_requested" ? (
                            <Badge variant="outline">
                              Cancelamento solicitado
                            </Badge>
                          ) : (
                            cancelButton(operation)
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {queue.running.length === 0 && (
                    <tr>
                      <td
                        colSpan={canCancel ? 6 : 5}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Nenhuma operação em execução.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
          <section aria-labelledby="queue-waiting" className="space-y-3">
            <div>
              <h2 className="font-semibold" id="queue-waiting">
                Próximas na fila ({queue.meta.total})
              </h2>
              <p className="text-xs text-muted-foreground">
                O worker sempre pega a operação mais antiga. Um Crawl de
                Produção espera enquanto outro crawl da mesma agência estiver
                em execução.
              </p>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left text-sm">
                <TableHead
                  titles={[
                    "Posição",
                    "Operação",
                    "Alvo",
                    "Solicitante",
                    "Na fila desde",
                    "Situação",
                    ...(canCancel ? [""] : []),
                  ]}
                />
                <tbody>
                  {queue.data.map((entry) => (
                    <tr
                      className="border-t align-top"
                      key={entry.operation.id}
                    >
                      <td className="p-3 font-semibold tabular-nums">
                        {entry.position}º
                      </td>
                      <td className="p-3">
                        <OperationCell operation={entry.operation} />
                      </td>
                      <td className="p-3">
                        <TargetCell operation={entry.operation} />
                      </td>
                      <td className="p-3">
                        {entry.operation.requester?.name ?? "—"}
                      </td>
                      <td className="whitespace-nowrap p-3">
                        {dateTime(entry.operation.created_at)}
                        <p className="text-xs text-muted-foreground">
                          há {duration(entry.operation.created_at, null)}
                        </p>
                      </td>
                      <td className="p-3">
                        <QueueSituation
                          entry={entry}
                          isNext={entry.operation.id === nextOperationId}
                        />
                      </td>
                      {canCancel && (
                        <td className="p-3 text-right">
                          {cancelButton(entry.operation)}
                        </td>
                      )}
                    </tr>
                  ))}
                  {queue.data.length === 0 && (
                    <tr>
                      <td
                        colSpan={canCancel ? 7 : 6}
                        className="p-6 text-center text-muted-foreground"
                      >
                        Nenhuma operação aguardando.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <BatchPagination
              meta={queue.meta}
              pending={query.isFetching}
              onPage={setPage}
            />
          </section>
        </>
      ) : (
        <p role="status">Carregando fila…</p>
      )}
      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Cancelar operação #{cancelling?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {cancelling?.state === "queued"
                ? "A operação sai da fila e não será executada pelo worker."
                : "O worker interrompe a execução assim que verificar o pedido de cancelamento."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={cancel.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (cancelling) cancel.mutate(cancelling);
              }}
            >
              {cancel.isPending ? "Cancelando…" : "Cancelar operação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
