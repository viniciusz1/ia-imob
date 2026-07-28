"use client";

import { ChevronDown, ExternalLink, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listDiscoverySnapshotUrls } from "@/services/crawlerService";
import type { DiscoverySnapshot, DiscoverySnapshotUrlPageSize, PaginatedDiscoverySnapshotUrls } from "@/types/crawler";

interface DiscoverySnapshotsPanelProps {
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

export function DiscoverySnapshotsPanel({ snapshots }: DiscoverySnapshotsPanelProps) {
  const [expandedSnapshotId, setExpandedSnapshotId] = useState<number | null>(null);
  const [urlStates, setUrlStates] = useState<Partial<Record<number, SnapshotUrlsState>>>({});

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
    return <p className="text-muted-foreground">Nenhum Discovery criado.</p>;
  }

  return (
    <div className="space-y-3">
      {snapshots.map((snapshot) => {
        const expanded = expandedSnapshotId === snapshot.id;
        const urlState = urlStates[snapshot.id];
        const loadedPage = urlState?.page;
        const refreshing = urlState?.status === "refreshing";
        const requestedPage = urlState?.requestedPage ?? loadedPage?.meta.current_page ?? 1;
        const requestedPerPage = urlState?.requestedPerPage ?? loadedPage?.meta.per_page ?? 20;
        const panelId = `discovery-snapshot-${snapshot.id}-urls`;

        return (
          <section className="overflow-hidden rounded-md border" key={snapshot.id}>
            <button
              aria-controls={panelId}
              aria-expanded={expanded}
              className="flex w-full cursor-pointer items-center justify-between gap-4 p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              onClick={() => toggleSnapshot(snapshot.id)}
              type="button"
            >
              <span>
                <strong>Snapshot #{snapshot.id}</strong>
                <span className="ml-2 text-sm text-muted-foreground">{snapshot.url_count} URLs · {formatDate(snapshot.created_at)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                {expanded ? "Ocultar URLs" : "Ver URLs"}
                <ChevronDown aria-hidden="true" className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </span>
            </button>

            {expanded && (
              <div aria-busy={urlState?.status === "loading" || urlState?.status === "refreshing"} className="border-t" id={panelId}>
                {urlState?.status === "loading" && <p className="p-4 text-sm text-muted-foreground" role="status">Carregando URLs do Snapshot…</p>}
                {urlState?.status === "error" && urlState.page === undefined && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-4" role="alert">
                    <p className="text-sm text-destructive">Não foi possível carregar as URLs deste Snapshot.</p>
                    <Button onClick={() => void loadUrls(snapshot.id, urlState.requestedPage, urlState.requestedPerPage)} size="sm" type="button" variant="outline">Tentar novamente</Button>
                  </div>
                )}
                {loadedPage !== undefined && loadedPage.data.length === 0 && <p className="p-4 text-sm text-muted-foreground">Este Snapshot não contém URLs.</p>}
                {loadedPage !== undefined && loadedPage.data.length > 0 && (
                  <>
                    <div className="max-h-[32rem] overflow-y-auto">
                      <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky top-0 w-16 bg-background">#</TableHead>
                          <TableHead className="sticky top-0 bg-background">URL</TableHead>
                          <TableHead className="sticky top-0 w-48 bg-background">Descoberta em</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loadedPage.data.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">{((loadedPage.meta.current_page - 1) * loadedPage.meta.per_page) + index + 1}</TableCell>
                            <TableCell className="whitespace-normal">
                              <a className="inline-flex items-start gap-1 break-all text-primary underline-offset-4 hover:underline" href={item.url} rel="noreferrer" target="_blank">
                                {item.url}<ExternalLink aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                              </a>
                            </TableCell>
                            <TableCell className="text-muted-foreground"><time dateTime={item.created_at}>{formatDate(item.created_at)}</time></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 p-3">
                      <label className="flex items-center gap-2 text-sm">
                        Itens por página
                        <select
                          aria-label={`Itens por página do Snapshot #${snapshot.id}`}
                          className="h-9 rounded-md border bg-background px-2"
                          disabled={refreshing}
                          onChange={(event) => void loadUrls(snapshot.id, 1, Number(event.target.value) as DiscoverySnapshotUrlPageSize)}
                          value={loadedPage.meta.per_page}
                        >
                          {PAGE_SIZES.map((pageSize) => <option key={pageSize} value={pageSize}>{pageSize}</option>)}
                        </select>
                      </label>
                      <span className="text-sm text-muted-foreground">
                        {refreshing && <span className="mr-2 inline-flex items-center gap-1" role="status"><LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />Atualizando…</span>}
                        Página {loadedPage.meta.current_page} de {loadedPage.meta.last_page} · {loadedPage.meta.total} URLs
                      </span>
                      <div className="flex gap-2">
                        <Button
                          disabled={refreshing || loadedPage.meta.current_page <= 1}
                          onClick={() => void loadUrls(snapshot.id, loadedPage.meta.current_page - 1, loadedPage.meta.per_page)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >Anterior</Button>
                        <Button
                          disabled={refreshing || loadedPage.meta.current_page >= loadedPage.meta.last_page}
                          onClick={() => void loadUrls(snapshot.id, loadedPage.meta.current_page + 1, loadedPage.meta.per_page)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >Próxima</Button>
                      </div>
                    </div>
                    {urlState?.status === "error" && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3" role="alert">
                        <p className="text-sm text-destructive">Não foi possível atualizar esta página.</p>
                        <Button onClick={() => void loadUrls(snapshot.id, requestedPage, requestedPerPage)} size="sm" type="button" variant="outline">Tentar novamente</Button>
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
  );
}
