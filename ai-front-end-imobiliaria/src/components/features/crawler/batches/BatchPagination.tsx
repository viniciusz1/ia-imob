import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { cn } from "@/lib/utils";
import type { BatchPage } from "@/types/productionBatch";

/**
 * The shared table pagination fed by a batch page's meta. While a page is
 * loading the controls are inert, as before.
 */
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
    <div aria-busy={pending || undefined} className={cn(pending && "pointer-events-none opacity-60")}>
      <PaginationFooter
        onPageChange={(page) => {
          if (!pending) onPage(page);
        }}
        page={meta.current_page}
        pageCount={meta.last_page}
        pageSize={meta.per_page}
        total={meta.total}
      />
    </div>
  );
}
