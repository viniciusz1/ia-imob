"use client";

import { History } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { OperationStateBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { EmptyState } from "@/components/layout/EmptyState";
import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientPagination } from "@/hooks/useClientPagination";
import type { CrawlerOperation, CrawlRun } from "@/types/crawler";

interface CrawlHistoryPanelProps {
  agencyId: number;
  operations: CrawlerOperation[];
  runs: CrawlRun[];
}

type CrawlType = "all" | "profile_validation" | "production_crawl";

const typeOptions: Array<{ key: CrawlType; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "profile_validation", label: "Validação" },
  { key: "production_crawl", label: "Produção" },
];

export function CrawlHistoryPanel({ agencyId, operations, runs }: CrawlHistoryPanelProps) {
  const [type, setType] = useState<CrawlType>("all");
  const rows = useMemo(() => {
    const relevantOperations = operations.filter((operation) => operation.type === "profile_validation" || operation.type === "production_crawl");
    const operationRows = relevantOperations.map((operation) => ({ operation, run: runs.find((run) => run.operation_id === operation.id) ?? null }));
    const knownOperationIds = new Set(relevantOperations.map((operation) => operation.id));
    const runRows = runs
      .filter((run) => !knownOperationIds.has(run.operation_id))
      .map((run) => ({ operation: null, run }));

    return [...operationRows, ...runRows]
      .filter(({ operation }) => type === "all" || (type === "profile_validation" ? operation?.type === type : operation?.type === type || operation === null))
      .sort((left, right) => new Date(right.operation?.created_at ?? right.run?.created_at ?? 0).getTime() - new Date(left.operation?.created_at ?? left.run?.created_at ?? 0).getTime());
  }, [operations, runs, type]);
  const pagination = useClientPagination(rows);
  const footer = (
    <PaginationFooter
      onPageChange={pagination.setPage}
      page={pagination.page}
      pageCount={pagination.pageCount}
      pageSize={pagination.pageSize}
      total={pagination.total}
    />
  );

  if (operations.length === 0 && runs.length === 0) {
    return (
      <>
        <EmptyState icon={History} title="Nenhum crawl executado." variant="inline" />
        {footer}
      </>
    );
  }

  return (
    <>
      <div
        aria-label="Filtrar histórico por tipo"
        className="flex flex-wrap gap-2 border-b px-4 py-3 sm:px-5"
        role="group"
      >
        {typeOptions.map((option) => (
          <Button
            aria-pressed={type === option.key}
            key={option.key}
            onClick={() => {
              setType(option.key);
              pagination.setPage(1);
            }}
            size="xs"
            type="button"
            variant={type === option.key ? "default" : "outline"}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={History} title="Nenhuma execução corresponde ao filtro." variant="inline" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tipo</TableHead>
              <TableHead>Execução</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-px">
                <span className="sr-only">Ações</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageItems.map(({ operation, run }) => {
              const validation = operation?.type === "profile_validation";
              const href = validation
                ? `/admin/crawler/agencies/${agencyId}/crawls/operations/${operation.id}`
                : run ? `/admin/crawler/runs/${run.id}` : `/admin/crawler/agencies/${agencyId}/crawls/operations/${operation?.id}`;
              const result = validation
                ? operation?.state === "succeeded" ? "Resultado da validação disponível" : "—"
                : run ? `${run.counts.normalized} normalizados · ${run.publication_state === "candidate" ? "Qualidade pendente" : run.publication_state === "quarantined" ? "Em quarentena" : "Publicado"}` : "Aguardando resultado técnico";
              const createdAt = operation?.created_at ?? run?.created_at;

              return (
                <TableRow key={operation?.id ?? `run-${run?.id}`}>
                  <TableCell>
                    <Badge variant="outline">{validation ? "Validação" : "Produção"}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">#{operation?.id ?? run?.operation_id}</TableCell>
                  <TableCell>
                    {operation ? <OperationStateBadge state={operation.state} /> : run ? <OperationStateBadge state={run.technical_state} /> : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{result}</TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {createdAt
                      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(createdAt))
                      : "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link className="text-primary hover:underline" href={href}>
                      Ver execução
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
      {footer}
    </>
  );
}
