"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const load = async (nextView: RunView, nextPage = 1) => {
    setView(nextView);
    setPage(await listCrawlRunRecords(runId, { view: nextView, search, sort, page: nextPage, per_page: 25 }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(labels) as RunView[]).map((item) => <Button key={item} onClick={() => void load(item)} type="button" variant={view === item ? "default" : "outline"}>{labels[item]}</Button>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input aria-label="Filtrar dados do crawl" onChange={(event) => setSearch(event.target.value)} placeholder="Filtrar por URL, cidade, bairro ou payload" value={search} />
        <select aria-label="Ordenação" className="rounded-md border bg-transparent px-3" onChange={(event) => setSort(event.target.value)} value={sort}>
          <option value="-created_at">Mais recentes</option>
          <option value="created_at">Mais antigos</option>
          {view === "normalized" && <option value="-valor">Maior valor</option>}
          {view === "normalized" && <option value="valor">Menor valor</option>}
        </select>
        <Button onClick={() => void load(view)} type="button" variant="outline">Aplicar</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th>ID</th><th>URL / Local</th><th>Valor</th><th>Detalhes</th></tr></thead>
          <tbody>
            {page.data.map((record) => (
              <tr className="border-t align-top" key={record.id}>
                <td className="p-2">{record.id}</td>
                <td className="p-2">{record.url ?? [record.bairro, record.cidade].filter(Boolean).join(" · ")}</td>
                <td className="p-2">{typeof record.valor === "number" ? record.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}</td>
                <td className="p-2">
                  <details open>
                    <summary className="cursor-pointer">Ver payload e trace</summary>
                    {record.normalization_warnings?.map((warning) => <p className="text-amber-700" key={warning}>{warning}</p>)}
                    <pre className="max-w-xl whitespace-pre-wrap">{JSON.stringify(record.raw_payload ?? record.payload, null, 2)}</pre>
                    <pre className="max-w-xl whitespace-pre-wrap">{JSON.stringify(record.extraction_trace ?? {}, null, 2)}</pre>
                    {record.missing_fields && <p>Campos ausentes: {record.missing_fields.join(", ")}</p>}
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>{page.meta.total} registros</span>
        <div className="flex gap-2">
          <Button disabled={page.meta.current_page <= 1} onClick={() => void load(view, page.meta.current_page - 1)} size="sm" variant="outline">Anterior</Button>
          <Button disabled={page.meta.current_page >= page.meta.last_page} onClick={() => void load(view, page.meta.current_page + 1)} size="sm" variant="outline">Próxima</Button>
        </div>
      </div>
    </div>
  );
}
