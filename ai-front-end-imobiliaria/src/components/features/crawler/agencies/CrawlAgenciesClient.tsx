"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { usePermission } from "@/hooks/usePermission";
import { queueBulkProductionCrawls } from "@/services/crawlerService";
import type { BulkProductionCrawlResult, CrawlAgency } from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface CrawlAgenciesClientProps {
  initialAgencies: CrawlAgency[];
  initialSearch: string;
  pageCount: number;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatUpdatedAt(value: string | null): string {
  if (value === null) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

const columns: ColumnDef<CrawlAgency>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/crawler/agencies/${row.original.id}`}>
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "root_domain", header: "Domínio" },
  {
    accessorKey: "lifecycle_state",
    header: "Lifecycle",
    cell: ({ row }) => <Badge variant="outline">{row.original.lifecycle_state}</Badge>,
  },
  {
    accessorKey: "health_state",
    header: "Saúde",
    cell: ({ row }) => <Badge variant="secondary">{row.original.health_state}</Badge>,
  },
  {
    accessorKey: "updated_at",
    header: "Modificado em",
    cell: ({ row }) => (
      <time className="text-muted-foreground" dateTime={row.original.updated_at}>
        {formatUpdatedAt(row.original.updated_at)}
      </time>
    ),
  },
];

export function CrawlAgenciesClient({ initialAgencies, initialSearch, pageCount }: CrawlAgenciesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkProductionCrawlResult | null>(null);
  const canExecute = usePermission("crawler.operations.execute");

  async function rerunActiveCrawls() {
    setBulkPending(true);
    try {
      const result = await queueBulkProductionCrawls();
      setBulkResult(result);
      setConfirmOpen(false);
      toast.success(`${result.summary.enqueued} crawl(s) enfileirado(s).`);
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível enfileirar os crawls ativos."));
    } finally {
      setBulkPending(false);
    }
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const normalizedSearch = search.trim();

    params.delete("page");
    if (normalizedSearch === "") params.delete("search");
    else params.set("search", normalizedSearch);

    const query = params.toString();
    router.push(query === "" ? pathname : `${pathname}?${query}`);
  }

  function clearSearch() {
    setSearch("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("search");
    const query = params.toString();
    router.push(query === "" ? pathname : `${pathname}?${query}`);
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Crawl Agencies</h2>
          <p className="text-muted-foreground">
            Fontes globais de dados de mercado, independentes das Agencies clientes.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {canExecute && (
            <AlertDialog onOpenChange={setConfirmOpen} open={confirmOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline">Rodar todos os crawls ativos novamente</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Rodar todos os crawls ativos novamente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação considera todas as Crawl Agencies com lifecycle ativo, independentemente da busca e da página atual. Cada execução usará Discovery novo e a configuração atualmente ativa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={bulkPending}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={bulkPending}
                    onClick={(event) => {
                      event.preventDefault();
                      void rerunActiveCrawls();
                    }}
                  >
                    {bulkPending ? "Enfileirando…" : "Confirmar e enfileirar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/admin/crawler/agencies/new">
            Nova Crawl Agency
          </Link>
        </div>
      </div>

      {bulkResult && (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4" role="status">
          <div>
            <p className="font-medium">Reexecução dos crawls ativos</p>
            <p className="text-sm text-muted-foreground">
              {bulkResult.summary.enqueued} de {bulkResult.summary.active_agencies} enfileirada(s); {bulkResult.summary.skipped} ignorada(s).
            </p>
          </div>
          {bulkResult.group && (
            <Link className="inline-flex text-sm font-medium underline" href={`/admin/crawler/operations?group_id=${bulkResult.group.id}`}>
              Acompanhar grupo na fila global
            </Link>
          )}
          {bulkResult.skipped.length > 0 && (
            <div>
              <p className="text-sm font-medium">Crawl Agencies ignoradas</p>
              <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                {bulkResult.skipped.map((skipped) => (
                  <li key={skipped.crawl_agency.id}>
                    <Link className="underline" href={`/admin/crawler/agencies/${skipped.crawl_agency.id}`}>
                      {skipped.crawl_agency.name}
                    </Link>
                    {`: ${skipped.message}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <form className="flex gap-2" onSubmit={applySearch}>
        <Input
          aria-label="Filtrar Crawl Agencies"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome ou domínio"
          type="search"
          value={search}
        />
        <Button type="submit">Buscar</Button>
        {(search !== "" || initialSearch !== "") && (
          <Button onClick={clearSearch} type="button" variant="outline">Limpar</Button>
        )}
      </form>

      <DataTable
        columns={columns}
        data={initialAgencies}
        emptyMessage="Nenhuma Crawl Agency encontrada."
        pageCount={pageCount}
      />
    </section>
  );
}
