"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePermission } from "@/hooks/usePermission";
import { queueBulkProductionCrawls } from "@/services/crawlerService";
import type { BulkProductionCrawlResult, CrawlAgency } from "@/types/crawler";

import { crawlerOperationErrorMessage } from "../crawlerOperationFeedback";

interface CrawlAgenciesClientProps {
  initialAgencies: CrawlAgency[];
  initialLifecycle?: string;
  initialPerPage?: number;
  initialSearch: string;
  pageCount: number;
  totalCount?: number;
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function formatDateTime(value: string | null | undefined): string {
  if (value === null || value === undefined) return "—";
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
    accessorKey: "last_crawled_at",
    header: "Último crawl",
    cell: ({ row }) => (
      <time className="text-muted-foreground" dateTime={row.original.last_crawled_at ?? undefined}>
        {formatDateTime(row.original.last_crawled_at)}
      </time>
    ),
  },
  {
    accessorKey: "updated_at",
    header: "Modificado em",
    cell: ({ row }) => (
      <time className="text-muted-foreground" dateTime={row.original.updated_at}>
        {formatDateTime(row.original.updated_at)}
      </time>
    ),
  },
];

export function CrawlAgenciesClient({
  initialAgencies,
  initialLifecycle = "",
  initialPerPage = 15,
  initialSearch,
  pageCount,
}: CrawlAgenciesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialSearch);
  const [lifecycle, setLifecycle] = useState(initialLifecycle || "all");
  const [perPage, setPerPage] = useState(initialPerPage);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const bulkRequestKey = useRef<string | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkProductionCrawlResult | null>(null);
  const canExecute = usePermission("crawler.operations.execute");

  async function rerunActiveCrawls() {
    setBulkPending(true);
    try {
      bulkRequestKey.current ??= crypto.randomUUID();
      const result = await queueBulkProductionCrawls(bulkRequestKey.current);
      bulkRequestKey.current = null;
      setBulkResult(result);
      setConfirmOpen(false);
      toast.success(`${result.summary.enqueued} crawl(s) enfileirado(s).`);
    } catch (error: unknown) {
      toast.error(crawlerOperationErrorMessage(error, "Não foi possível enfileirar os crawls ativos."));
    } finally {
      setBulkPending(false);
    }
  }

  function updateQuery(nextParams: { search?: string; lifecycle?: string; perPage?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");

    const newSearch = (nextParams.search ?? search).trim();
    if (newSearch === "") params.delete("search");
    else params.set("search", newSearch);

    const newLifecycle = nextParams.lifecycle ?? lifecycle;
    if (!newLifecycle || newLifecycle === "all") params.delete("lifecycle_state");
    else params.set("lifecycle_state", newLifecycle);

    const newPerPage = nextParams.perPage ?? perPage;
    if (newPerPage === 15) params.delete("per_page");
    else params.set("per_page", newPerPage.toString());

    const query = params.toString();
    router.push(query === "" ? pathname : `${pathname}?${query}`);
  }

  function applySearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateQuery({ search });
  }

  function handleLifecycleChange(newLifecycle: string) {
    setLifecycle(newLifecycle);
    updateQuery({ lifecycle: newLifecycle });
  }

  function handlePerPageChange(newPerPageStr: string) {
    const numeric = Number(newPerPageStr);
    setPerPage(numeric);
    updateQuery({ perPage: numeric });
  }

  function clearFilters() {
    setSearch("");
    setLifecycle("all");
    setPerPage(15);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("search");
    params.delete("lifecycle_state");
    params.delete("per_page");
    const query = params.toString();
    router.push(query === "" ? pathname : `${pathname}?${query}`);
  }

  const isFiltered =
    search !== "" ||
    initialSearch !== "" ||
    (lifecycle !== "all" && lifecycle !== "") ||
    (initialLifecycle !== "" && initialLifecycle !== "all") ||
    perPage !== 15 ||
    initialPerPage !== 15;

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
          {bulkResult.batch && <Link className="text-sm font-medium underline" href={`/admin/crawler/batches/${bulkResult.batch.id}`}>Acompanhar lote #{bulkResult.batch.id}</Link>}
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

      <form className="flex flex-wrap items-center gap-2" onSubmit={applySearch}>
        <div className="min-w-[220px] flex-1">
          <Input
            aria-label="Filtrar Crawl Agencies"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou domínio"
            type="search"
            value={search}
          />
        </div>

        <Select onValueChange={handleLifecycleChange} value={lifecycle}>
          <SelectTrigger aria-label="Filtrar por lifecycle" className="w-[190px]">
            <SelectValue placeholder="Lifecycle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os lifecycles</SelectItem>
            <SelectItem value="active">Ativas (usuário final)</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="paused">Pausadas</SelectItem>
            <SelectItem value="archived">Arquivadas</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={handlePerPageChange} value={String(perPage)}>
          <SelectTrigger aria-label="Quantidade por página" className="w-[150px]">
            <SelectValue placeholder="Por página" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="15">15 por página</SelectItem>
            <SelectItem value="25">25 por página</SelectItem>
            <SelectItem value="50">50 por página</SelectItem>
            <SelectItem value="100">100 por página</SelectItem>
          </SelectContent>
        </Select>

        <Button type="submit">Buscar</Button>
        {isFiltered && (
          <Button onClick={clearFilters} type="button" variant="outline">
            Limpar
          </Button>
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
