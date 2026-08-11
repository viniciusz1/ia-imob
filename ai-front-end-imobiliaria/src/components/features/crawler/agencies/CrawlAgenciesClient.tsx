"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import type { CrawlAgency } from "@/types/crawler";

interface CrawlAgenciesClientProps {
  initialAgencies: CrawlAgency[];
  initialSearch: string;
  pageCount: number;
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
];

export function CrawlAgenciesClient({ initialAgencies, initialSearch, pageCount }: CrawlAgenciesClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

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
        <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/admin/crawler/agencies/new">
          Nova Crawl Agency
        </Link>
      </div>

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
