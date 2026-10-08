"use client";

import { ChevronDown, ExternalLink, Layers, LoaderCircle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/layout/EmptyState";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { listDiscoverySnapshotUrls } from "@/services/crawlerService";
import type {
  DiscoverySnapshot,
  DiscoverySnapshotUrlPageSize,
  OnboardingDiscoverySnapshotCandidate,
  OnboardingExecution,
  PaginatedDiscoverySnapshotUrls,
} from "@/types/crawler";

import { AdoptDiscoverySnapshotButton } from "../agencies/AdoptDiscoverySnapshotButton";

interface DiscoverySnapshotsPanelProps {
  onboardingRecovery?: {
    candidates: OnboardingDiscoverySnapshotCandidate[];
    executionId: number;
  };
  snapshots: DiscoverySnapshot[];
}

interface SnapshotUrlsState {
  page?: PaginatedDiscoverySnapshotUrls;
  requestedPage: number;
  requestedPerPage: DiscoverySnapshotUrlPageSize;
  status: "loading" | "loaded" | "refreshing" | "error";
}

const PAGE_SIZES: DiscoverySnapshotUrlPageSize[] = [20, 30, 100];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(value));
}

export function DiscoverySnapshotsPanel({ onboardingRecovery, snapshots }: DiscoverySnapshotsPanelProps) {
  const canExecute = usePermission("crawler.operations.execute");
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<number | null>(null);
  const [urlStates, setUrlStates] = useState<Partial<Record<number, SnapshotUrlsState>>>({});
  const [continuedExecution, setContinuedExecution] = useState<OnboardingExecution | null>(null);

  const loadUrls = async (snapshotId: number, page = 1, perPage: DiscoverySnapshotUrlPageSize = 20) => {
    setUrlStates((current) => ({
      ...current,
      [snapshotId]: {
        ...current[snapshotId],
        requestedPage: page,
        requestedPerPage: perPage,
        status: current[snapshotId]?.page === undefined ? "loading" : "refreshing",
      },
    }));
    try {
      const response = await listDiscoverySnapshotUrls(snapshotId, page, perPage);
      setUrlStates((current) => ({
        ...current,
        [snapshotId]: { page: response, requestedPage: page, requestedPerPage: perPage, status: "loaded" },
      }));
    } catch {
      setUrlStates((current) => ({
        ...current,
        [snapshotId]: {
          ...current[snapshotId],
          requestedPage: page,
          requestedPerPage: perPage,
          status: "error",
        },
      }));
    }
  };

  const toggleSnapshot = (snapshotId: number) => {
    if (expandedSnapshotId === snapshotId) {
      setExpandedSnapshotId(null);
      return;
    }

    setExpandedSnapshotId(snapshotId);
    if (urlStates[snapshotId] === undefined) void loadUrls(snapshotId);
  };

  if (snapshots.length === 0) {
    return <EmptyState icon={Layers} title="Nenhum Discovery criado." variant="inline" />;
  }

  return (
    <div>
      {onboardingRecovery && (
        <div className="border-b px-4 py-4 sm:px-5">
          <aside className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
            <RotateCcw aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="min-w-0 space-y-1">
              <p className="text-foreground">Continuar Execução de Onboarding #{onboardingRecovery.executionId}</p>
              <p className="text-muted-foreground">
                Escolha um Snapshot elegível abaixo. A execução personalizada continuará independente e o resultado adotado ficará auditado no Onboarding.
              </p>
              {!canExecute && (
                <p className="text-muted-foreground">Somente leitura: você não pode adotar um Snapshot.</p>
              )}
              {continuedExecution && (
                <Link
                  className="inline-flex text-primary hover:underline"
                  href={`/admin/crawler/agencies/${continuedExecution.crawl_agency_id}/onboarding/${continuedExecution.id}`}
                >
                  Abrir Onboarding #{continuedExecution.id}
                </Link>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="divide-y">
        {snapshots.map((snapshot) => {
          const expanded = expandedSnapshotId === snapshot.id;
          const adoptionCandidate = onboardingRecovery?.candidates.find((candidate) => candidate.id === snapshot.id);
          const urlState = urlStates[snapshot.id];
          const loadedPage = urlState?.page;
          const refreshing = urlState?.status === "refreshing";
          const requestedPage = urlState?.requestedPage ?? loadedPage?.meta.current_page ?? 1;
          const requestedPerPage = urlState?.requestedPerPage ?? loadedPage?.meta.per_page ?? 20;
          const panelId = `discovery-snapshot-${snapshot.id}-urls`;
          const firstItem = loadedPage === undefined || loadedPage.meta.total === 0
            ? 0
            : ((loadedPage.meta.current_page - 1) * loadedPage.meta.per_page) + 1;
          const lastItem = loadedPage === undefined
            ? 0
            : Math.min(loadedPage.meta.current_page * loadedPage.meta.per_page, loadedPage.meta.total);

          return (
            <section key={snapshot.id}>
              <button
                aria-controls={panelId}
                aria-expanded={expanded}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-inset sm:px-5",
                  expanded && "bg-muted/40",
                )}
                onClick={() => toggleSnapshot(snapshot.id)}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">Snapshot #{snapshot.id}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {snapshot.url_count} URLs · {formatDate(snapshot.created_at)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  {expanded ? "Ocultar URLs" : "Ver URLs"}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
                  />
                </span>
              </button>

              {onboardingRecovery && adoptionCandidate && canExecute && (
                <div className="space-y-2 border-t bg-primary/5 px-4 py-3 sm:px-5">
                  {adoptionCandidate.adoption.sample_url && (
                    <p className="text-sm break-all">
                      <span className="text-muted-foreground">URL de Amostra:</span> {adoptionCandidate.adoption.sample_url}
                    </p>
                  )}
                  <AdoptDiscoverySnapshotButton
                    candidate={adoptionCandidate}
                    executionId={onboardingRecovery.executionId}
                    onAdopted={setContinuedExecution}
                  />
                </div>
              )}

              {expanded && (
                <div
                  aria-busy={urlState?.status === "loading" || urlState?.status === "refreshing"}
                  className="border-t"
                  id={panelId}
                >
                  {urlState?.status === "loading" && (
                    <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground sm:px-5" role="status">
                      <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                      Carregando URLs do Snapshot…
                    </p>
                  )}
                  {urlState?.status === "error" && urlState.page === undefined && (
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5" role="alert">
                      <p className="text-sm text-destructive">Não foi possível carregar as URLs deste Snapshot.</p>
                      <Button
                        onClick={() => void loadUrls(snapshot.id, urlState.requestedPage, urlState.requestedPerPage)}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Tentar novamente
                      </Button>
                    </div>
                  )}
                  {loadedPage !== undefined && loadedPage.data.length === 0 && (
                    <p className="px-4 py-3 text-sm text-muted-foreground sm:px-5">Este Snapshot não contém URLs.</p>
                  )}
                  {loadedPage !== undefined && loadedPage.data.length > 0 && (
                    <>
                      <div className="max-h-[32rem] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="sticky top-0 w-16 bg-card">#</TableHead>
                              <TableHead className="sticky top-0 bg-card">URL</TableHead>
                              <TableHead className="sticky top-0 w-48 bg-card">Descoberta em</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadedPage.data.map((item, index) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-muted-foreground tabular-nums">
                                  {((loadedPage.meta.current_page - 1) * loadedPage.meta.per_page) + index + 1}
                                </TableCell>
                                <TableCell className="whitespace-normal">
                                  <a
                                    className="inline-flex items-start gap-1 break-all text-primary hover:underline"
                                    href={item.url}
                                    rel="noreferrer"
                                    target="_blank"
                                  >
                                    {item.url}
                                    <ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                                  </a>
                                </TableCell>
                                <TableCell className="text-muted-foreground tabular-nums">
                                  <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <span className="text-sm text-muted-foreground tabular-nums">
                            Exibindo {firstItem}–{lastItem} de {loadedPage.meta.total} URLs
                          </span>
                          {refreshing && (
                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" role="status">
                              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                              Atualizando…
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            Itens por página
                            <NativeSelect
                              aria-label={`Itens por página do Snapshot #${snapshot.id}`}
                              disabled={refreshing}
                              onChange={(event) => void loadUrls(
                                snapshot.id,
                                1,
                                Number(event.target.value) as DiscoverySnapshotUrlPageSize,
                              )}
                              size="sm"
                              value={loadedPage.meta.per_page}
                              wrapperClassName="w-20"
                            >
                              {PAGE_SIZES.map((pageSize) => <option key={pageSize} value={pageSize}>{pageSize}</option>)}
                            </NativeSelect>
                          </label>
                          <div className="flex items-center gap-2">
                            <Button
                              disabled={refreshing || loadedPage.meta.current_page <= 1}
                              onClick={() => void loadUrls(snapshot.id, loadedPage.meta.current_page - 1, loadedPage.meta.per_page)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Anterior
                            </Button>
                            <Button
                              disabled={refreshing || loadedPage.meta.current_page >= loadedPage.meta.last_page}
                              onClick={() => void loadUrls(snapshot.id, loadedPage.meta.current_page + 1, loadedPage.meta.per_page)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              Próxima
                            </Button>
                          </div>
                        </div>
                      </div>
                      {urlState?.status === "error" && (
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3" role="alert">
                          <p className="text-sm text-destructive">Não foi possível atualizar esta página.</p>
                          <Button
                            onClick={() => void loadUrls(snapshot.id, requestedPage, requestedPerPage)}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Tentar novamente
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
