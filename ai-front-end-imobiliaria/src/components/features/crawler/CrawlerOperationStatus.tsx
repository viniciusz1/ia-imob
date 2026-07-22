import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { CrawlerOperation } from "@/types/crawler";

const stateLabels: Record<CrawlerOperation["state"], string> = {
  queued: "Na fila",
  running: "Em execução",
  cancellation_requested: "Cancelamento solicitado",
  succeeded: "Concluída",
  failed: "Falhou",
  cancelled: "Cancelada",
};

export function CrawlerOperationStatus({ agencyId, operation }: { agencyId: number; operation: CrawlerOperation }) {
  return (
    <section aria-label={`Operação ${operation.id}`} className="space-y-2 rounded-md border bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">Operação #{operation.id}</p>
        <Badge variant="outline">{stateLabels[operation.state]}</Badge>
      </div>
      <Progress value={operation.progress.percentage} />
      <p className="text-sm">{operation.progress.stage} · {operation.progress.percentage}%</p>
      {operation.progress.message && <p className="text-sm text-muted-foreground">{operation.progress.message}</p>}
      {operation.error && <p className="text-sm text-destructive">{operation.error.message}</p>}
      <Link className="inline-block text-sm underline underline-offset-4" href={`/admin/crawler/operations?crawl_agency_id=${agencyId}`}>Abrir na fila global</Link>
    </section>
  );
}
