"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CrawlerOperation, CrawlRun } from "@/types/crawler";

interface CrawlHistoryPanelProps {
  agencyId: number;
  operations: CrawlerOperation[];
  runs: CrawlRun[];
}

type CrawlType = "all" | "profile_validation" | "production_crawl";

const stateLabels: Record<CrawlerOperation["state"], string> = {
  queued: "Na fila",
  running: "Em andamento",
  cancellation_requested: "Cancelamento solicitado",
  succeeded: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

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

  if (operations.length === 0 && runs.length === 0) return <p className="text-sm text-muted-foreground">Nenhum crawl executado.</p>;

  return (
    <div className="space-y-4">
      <div aria-label="Filtrar histórico por tipo" className="flex flex-wrap gap-2" role="group">
        {([{"key":"all","label":"Todos"},{"key":"profile_validation","label":"Validação"},{"key":"production_crawl","label":"Produção"}] as Array<{ key: CrawlType; label: string }>).map((option) => <Button aria-pressed={type === option.key} key={option.key} onClick={() => setType(option.key)} size="sm" type="button" variant={type === option.key ? "default" : "outline"}>{option.label}</Button>)}
      </div>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma execução corresponde ao filtro.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b"><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Execução</th><th className="px-3 py-2">Estado</th><th className="px-3 py-2">Resultado</th><th className="px-3 py-2">Criado em</th><th className="px-3 py-2"><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>{rows.map(({ operation, run }) => {
              const validation = operation?.type === "profile_validation";
              const href = validation
                ? `/admin/crawler/agencies/${agencyId}/crawls/operations/${operation.id}`
                : run ? `/admin/crawler/runs/${run.id}` : `/admin/crawler/agencies/${agencyId}/crawls/operations/${operation?.id}`;
              const result = validation
                ? operation?.state === "succeeded" ? "Resultado da validação disponível" : "—"
                : run ? `${run.counts.normalized} normalizados · ${run.publication_state === "candidate" ? "Qualidade pendente" : run.publication_state === "quarantined" ? "Em quarentena" : "Publicado"}` : "Aguardando resultado técnico";
              const state = operation ? stateLabels[operation.state] : run?.technical_state === "succeeded" ? "Concluído" : run?.technical_state ?? "—";
              const createdAt = operation?.created_at ?? run?.created_at;
              return <tr className="border-b" key={operation?.id ?? `run-${run?.id}`}><td className="px-3 py-3"><Badge variant="outline">{validation ? "Validação" : "Produção"}</Badge></td><td className="px-3 py-3">#{operation?.id ?? run?.operation_id}</td><td className="px-3 py-3">{state}</td><td className="px-3 py-3">{result}</td><td className="px-3 py-3">{createdAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(createdAt)) : "—"}</td><td className="px-3 py-3"><Link className="underline" href={href}>Ver execução</Link></td></tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
