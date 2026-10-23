import { Button } from "@/components/ui/button";
import type { BatchPage } from "@/types/productionBatch";
export function BatchPagination({
  meta,
  onPage,
  pending = false,
}: {
  meta: BatchPage<unknown>["meta"];
  onPage: (page: number) => void;
  pending?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {meta.total} resultado(s) · Página {meta.current_page} de{" "}
        {meta.last_page}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          disabled={pending || meta.current_page <= 1}
          onClick={() => onPage(meta.current_page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          disabled={pending || meta.current_page >= meta.last_page}
          onClick={() => onPage(meta.current_page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
