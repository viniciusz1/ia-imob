"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { CrawlerHeaderActions } from "@/components/features/crawler/CrawlerHeaderActions";
import { HealthBadge, LifecycleBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import type { CrawlAgency } from "@/types/crawler";

interface CrawlAgenciesClientProps {
  initialAgencies: CrawlAgency[];
  initialSearch: string;
  pageCount: number;
  total?: number;
  pageSize?: number;
}

const columns: ColumnDef<CrawlAgency>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <Link
        className="text-sm text-foreground hover:text-primary hover:underline"
        href={`/admin/crawler/agencies/${row.original.id}`}
      >
        {row.original.name}
      </Link>
    ),
  },
  {
    accessorKey: "root_domain",
    header: "Domínio",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.root_domain}</span>,
  },
  {
    accessorKey: "lifecycle_state",
    header: "Ciclo de vida",
    cell: ({ row }) => <LifecycleBadge state={row.original.lifecycle_state} />,
  },
  {
    accessorKey: "health_state",
    header: "Saúde",
    cell: ({ row }) => <HealthBadge state={row.original.health_state} />,
  },
];

export function CrawlAgenciesClient({ initialAgencies, initialSearch, pageCount, total, pageSize }: CrawlAgenciesClientProps) {
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
    <div className="space-y-6">
      <PageHeader
        actions={<CrawlerHeaderActions actions={["registerAgency"]} />}
        description="Fontes globais de dados de mercado, independentes das Agencies clientes."
        title="Crawl Agencies"
      />

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" onSubmit={applySearch}>
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filtrar Crawl Agencies"
            className="pl-9"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nome ou domínio"
            type="search"
            value={search}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline">Buscar</Button>
          {(search !== "" || initialSearch !== "") && (
            <Button onClick={clearSearch} type="button" variant="ghost">Limpar</Button>
          )}
        </div>
      </form>

      <DataTable
        columns={columns}
        data={initialAgencies}
        emptyMessage="Nenhuma Crawl Agency encontrada."
        pageCount={pageCount}
        pageSize={pageSize}
        total={total}
      />
    </div>
  );
}
