"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";

import { DEFAULT_PAGE_SIZE, PaginationFooter } from "@/components/layout/PaginationFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listCrawlRunRecords } from "@/services/crawlerService";
import type { PaginatedCrawlRunRecords } from "@/types/crawler";

type RunView = "normalized" | "raw" | "rejected";

interface CrawlRunDataTableProps {
  runId: number;
  initialPage: PaginatedCrawlRunRecords;
}

const labels: Record<RunView, string> = { normalized: "Normalizados", raw: "Brutos", rejected: "Rejeitados" };

export function CrawlRunDataTable({ runId, initialPage }: CrawlRunDataTableProps) {
  const [view, setView] = useState<RunView>("normalized");
  const [page, setPage] = useState(initialPage);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [listingState, setListingState] = useState("");

  const load = async (nextView: RunView, nextPage = 1) => {
    setView(nextView);
    const state = listingState as "new" | "changed" | "unchanged" | "missing" | "removed" | "reappeared";
    setPage(await listCrawlRunRecords(runId, {
      view: nextView,
      search,
      sort,
      listing_state: nextView === "normalized" && listingState ? state : undefined,
      page: nextPage,
      per_page: DEFAULT_PAGE_SIZE,
    }));
  };

  return (
    <>
      <div className="space-y-3 border-b px-4 py-4 sm:px-5">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(labels) as RunView[]).map((item) => (
            <Button
              key={item}
              onClick={() => void load(item)}
              size="xs"
              type="button"
              variant={view === item ? "default" : "outline"}
            >
              {labels[item]}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Input
            aria-label="Filtrar dados do crawl"
            className="sm:max-w-sm sm:flex-1"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar por URL, cidade, bairro ou payload"
            value={search}
          />
          <NativeSelect
            aria-label="Ordenação"
            onChange={(event) => setSort(event.target.value)}
            value={sort}
            wrapperClassName="sm:w-44"
          >
            <option value="-created_at">Mais recentes</option>
            <option value="created_at">Mais antigos</option>
            {view === "normalized" && <option value="-valor">Maior valor</option>}
            {view === "normalized" && <option value="valor">Menor valor</option>}
          </NativeSelect>
          {view === "normalized" && (
            <NativeSelect
              aria-label="Estado do anúncio"
              onChange={(event) => setListingState(event.target.value)}
              value={listingState}
              wrapperClassName="sm:w-44"
            >
              <option value="">Todos os estados</option>
              <option value="new">Novo</option>
              <option value="changed">Alterado</option>
              <option value="unchanged">Inalterado</option>
              <option value="missing">Ausente</option>
              <option value="removed">Removido</option>
              <option value="reappeared">Reapareceu</option>
            </NativeSelect>
          )}
          <Button onClick={() => void load(view)} type="button" variant="outline">Aplicar</Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-px">ID</TableHead>
            <TableHead>URL / Local</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Detalhes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {page.data.map((record) => (
            <TableRow className="hover:bg-transparent [&>td]:align-top" key={record.id}>
              <TableCell className="tabular-nums">{record.id}</TableCell>
              <TableCell className="max-w-xs break-all whitespace-normal">
                {record.url ?? [record.bairro, record.cidade].filter(Boolean).join(" · ")}
              </TableCell>
              <TableCell className="tabular-nums">
                {typeof record.valor === "number" ? record.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
              </TableCell>
              <TableCell className="space-y-2 whitespace-normal">
                {record.listing_state && (
                  <p>
                    {record.listing_state === "missing" ? "Ausente" : record.listing_state} · {record.absence_count ?? 0} publicação(ões) ausente(s)
                  </p>
                )}
                {record.listing_reason && <p className="text-xs text-muted-foreground">Motivo: {record.listing_reason}</p>}
                <details className="space-y-2" open>
                  <summary className="cursor-pointer text-xs text-primary hover:underline">Ver payload e trace</summary>
                  {record.normalization_warnings?.map((warning) => (
                    <p className="flex items-start gap-1.5 text-xs text-warning" key={warning}>
                      <TriangleAlert className="mt-px size-3.5 shrink-0" />
                      {warning}
                    </p>
                  ))}
                  <pre className="max-w-xl overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
                    {JSON.stringify(record.raw_payload ?? record.payload, null, 2)}
                  </pre>
                  <pre className="max-w-xl overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted p-3 font-mono text-xs">
                    {JSON.stringify(record.extraction_trace ?? {}, null, 2)}
                  </pre>
                  {record.missing_fields && (
                    <p className="text-xs text-muted-foreground">Campos ausentes: {record.missing_fields.join(", ")}</p>
                  )}
                </details>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationFooter
        onPageChange={(nextPage) => void load(view, nextPage)}
        page={page.meta.current_page}
        pageCount={page.meta.last_page}
        pageSize={page.meta.per_page}
        total={page.meta.total}
      />
    </>
  );
}
