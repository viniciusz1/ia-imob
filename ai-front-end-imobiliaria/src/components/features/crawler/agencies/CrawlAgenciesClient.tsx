"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CrawlAgency } from "@/types/crawler";

interface CrawlAgenciesClientProps {
  initialAgencies: CrawlAgency[];
}

export function CrawlAgenciesClient({ initialAgencies }: CrawlAgenciesClientProps) {
  const [search, setSearch] = useState("");
  const filteredAgencies = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return initialAgencies;

    return initialAgencies.filter((agency) =>
      `${agency.name} ${agency.root_domain}`.toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [initialAgencies, search]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Crawl Agencies</h2>
          <p className="text-muted-foreground">
            Fontes globais de dados de mercado, independentes das Agencies clientes.
          </p>
        </div>
        <Link className="rounded-md bg-primary px-4 py-2 text-primary-foreground" href="/admin/crawler/agencies/new">
          Nova Crawl Agency
        </Link>
      </div>

      <Input
        aria-label="Filtrar Crawl Agencies"
        placeholder="Nome ou domínio"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Domínio</TableHead>
            <TableHead>Lifecycle</TableHead>
            <TableHead>Saúde</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredAgencies.map((agency) => (
            <TableRow key={agency.id}>
              <TableCell>
                <Link className="font-medium underline-offset-4 hover:underline" href={`/admin/crawler/agencies/${agency.id}`}>
                  {agency.name}
                </Link>
              </TableCell>
              <TableCell>{agency.root_domain}</TableCell>
              <TableCell><Badge variant="outline">{agency.lifecycle_state}</Badge></TableCell>
              <TableCell><Badge variant="secondary">{agency.health_state}</Badge></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
