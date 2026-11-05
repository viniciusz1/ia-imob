import type { BatchOutcome, BatchState } from "@/types/productionBatch";
export const outcomeLabels: Record<BatchOutcome | BatchState, string> = {
  queued: "Na fila",
  running: "Em execução",
  awaiting_quality: "Aguardando qualidade",
  completed: "Concluído",
  published: "Publicado",
  quarantined: "Quarentena",
  failed: "Falha técnica",
  cancelled: "Cancelado",
  skipped: "Ignorado",
};
export const resultLabels = {
  in_progress: "Em andamento",
  not_executed: "Não executado",
  succeeded: "Concluído com sucesso",
  partial: "Concluído com pendências",
  failed: "Concluído com problemas",
};
export const stageLabels: Record<string, string> = {
  queued: "Fila",
  claimed: "Iniciando",
  discovery: "Discovery",
  fetch: "Coleta das páginas",
  extraction: "Extração",
  normalization: "Normalização",
  persistence: "Persistência",
  quality: "Qualidade",
  publication: "Publicação",
  completed: "Finalizado",
  failed: "Falhou",
  timed_out: "Worker sem resposta",
  production_crawl: "Processando",
};
export function dateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}
export function duration(start: string | null, end: string | null): string {
  if (!start) return "—";
  const seconds = Math.max(
    0,
    Math.floor(
      ((end ? new Date(end).getTime() : Date.now()) -
        new Date(start).getTime()) /
        1000,
    ),
  );
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60) % 60}min`;
}
