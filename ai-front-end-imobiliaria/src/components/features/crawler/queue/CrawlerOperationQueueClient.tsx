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
import { Activity, ListOrdered, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
          className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
          href={detailHref}
        >
          #{operation.id}
        </Link>
      ) : (
        <span className="font-medium text-foreground">#{operation.id}</span>
      )}
      <p className="text-[0.8125rem] text-subtle">
        {typeLabels[operation.type] ?? operation.type}
      </p>
    </>
  );
}

function TargetCell({ operation }: { operation: CrawlerOperation }) {
  if (operation.crawl_agency) {
    return (
      <Link
        className="text-foreground underline-offset-4 hover:text-primary hover:underline"
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
        <Badge variant="warning">
          Aguardando #{entry.blocked_by_operation_id}
        </Badge>
        <p className="mt-1.5 max-w-64 text-[0.8125rem] leading-4 text-subtle">
          O worker pula esta operação até o crawl #
          {entry.blocked_by_operation_id} da mesma agência terminar.
        </p>
      </>
    );
  }
  return isNext ? (
    <Badge variant="success">Próxima</Badge>
  ) : (
    <Badge variant="muted">Na fila</Badge>
  );
}

function HeaderRow({ titles }: { titles: string[] }) {
  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        {titles.map((title, index) => (
          <TableHead key={index}>
            {title || <span className="sr-only">Ações</span>}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
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
        description="O que o worker está executando agora e a ordem em que pegará as próximas operações."
        title="Fila"
      />
      {query.isError && (
        <p
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          Não foi possível atualizar a fila. Tente novamente.
        </p>
      )}
      {queue ? (
        <>
          <section aria-labelledby="queue-running">
            <Card className="gap-0 overflow-hidden py-0">
              <SectionHeader
                description="Operações que o worker já pegou e está processando."
                icon={Activity}
                title={
                  <span id="queue-running">
                    Em execução agora ({queue.running.length})
                  </span>
                }
              />
              <Table>
                <HeaderRow
                  titles={[
                    "Operação",
                    "Alvo",
                    "Worker",
                    "Progresso",
                    "Iniciada",
                    ...(canCancel ? [""] : []),
                  ]}
                />
                <TableBody>
                  {queue.running.map((operation) => (
                    <TableRow key={operation.id}>
                      <TableCell>
                        <OperationCell operation={operation} />
                      </TableCell>
                      <TableCell>
                        <TargetCell operation={operation} />
                      </TableCell>
                      <TableCell>
                        {operation.worker?.worker_key ?? "—"}
                        <p className="text-[0.8125rem] text-subtle">
                          Último sinal{" "}
                          {dateTime(operation.progress.heartbeat_at)}
                        </p>
                      </TableCell>
                      <TableCell className="min-w-56 space-y-1.5">
                        <Progress value={operation.progress.percentage} />
                        <p className="text-[0.8125rem] text-subtle">
                          {stageLabels[operation.progress.stage] ??
                            operation.progress.stage}{" "}
                          · {operation.progress.percentage}%
                          {operation.progress.total
                            ? ` · ${operation.progress.processed}/${operation.progress.total}`
                            : ""}
                        </p>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {dateTime(operation.claimed_at ?? null)}
                        <p className="text-[0.8125rem] text-subtle">
                          há {duration(operation.claimed_at ?? null, null)}
                        </p>
                      </TableCell>
                      {canCancel && (
                        <TableCell className="text-right">
                          {operation.state === "cancellation_requested" ? (
                            <Badge variant="warning">
                              Cancelamento solicitado
                            </Badge>
                          ) : (
                            cancelButton(operation)
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {queue.running.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={canCancel ? 6 : 5}
                        className="h-20 text-center text-muted-foreground"
                      >
                        Nenhuma operação em execução.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </section>
          <section aria-labelledby="queue-waiting">
            <Card className="gap-0 overflow-hidden py-0">
              <SectionHeader
                description="O worker sempre pega a operação mais antiga. Um Crawl de Produção espera enquanto outro crawl da mesma agência estiver em execução."
                icon={ListOrdered}
                title={
                  <span id="queue-waiting">
                    Próximas na fila ({queue.meta.total})
                  </span>
                }
              />
              <Table>
                <HeaderRow
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
                <TableBody>
                  {queue.data.map((entry) => (
                    <TableRow key={entry.operation.id}>
                      <TableCell className="font-semibold text-foreground tabular-nums">
                        {entry.position}º
                      </TableCell>
                      <TableCell>
                        <OperationCell operation={entry.operation} />
                      </TableCell>
                      <TableCell>
                        <TargetCell operation={entry.operation} />
                      </TableCell>
                      <TableCell>
                        {entry.operation.requester?.name ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {dateTime(entry.operation.created_at)}
                        <p className="text-[0.8125rem] text-subtle">
                          há {duration(entry.operation.created_at, null)}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <QueueSituation
                          entry={entry}
                          isNext={entry.operation.id === nextOperationId}
                        />
                      </TableCell>
                      {canCancel && (
                        <TableCell className="text-right">
                          {cancelButton(entry.operation)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  {queue.data.length === 0 && (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={canCancel ? 7 : 6}
                        className="h-20 text-center text-muted-foreground"
                      >
                        Nenhuma operação aguardando.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <BatchPagination
                meta={queue.meta}
                pending={query.isFetching}
                onPage={setPage}
              />
            </Card>
          </section>
        </>
      ) : (
        <p
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
        >
          <Loader2 className="size-4 animate-spin" />
          Carregando fila…
        </p>
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
