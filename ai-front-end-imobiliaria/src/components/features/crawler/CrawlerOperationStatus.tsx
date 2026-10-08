import Link from "next/link";

import { OperationStateBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { Progress } from "@/components/ui/progress";
import type { CrawlerOperation } from "@/types/crawler";

export function CrawlerOperationStatus({ agencyId, operation }: { agencyId: number; operation: CrawlerOperation }) {
  return (
    <section aria-label={`Operação ${operation.id}`} className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground tabular-nums">Operação #{operation.id}</p>
        <OperationStateBadge state={operation.state} />
      </div>
      <Progress className="h-1.5" value={operation.progress.percentage} />
      <div className="space-y-1">
        <p className="text-sm tabular-nums">
          {operation.progress.stage} · {operation.progress.percentage}%
        </p>
        {operation.progress.message && <p className="text-xs text-muted-foreground">{operation.progress.message}</p>}
        {operation.error && <p className="text-sm text-destructive">{operation.error.message}</p>}
      </div>
      <Link
        className="inline-block text-sm text-primary hover:underline"
        href={`/admin/crawler/operations?crawl_agency_id=${agencyId}`}
      >
        Abrir na fila global
      </Link>
    </section>
  );
}
