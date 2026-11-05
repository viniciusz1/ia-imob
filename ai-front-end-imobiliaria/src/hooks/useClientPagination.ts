import { useMemo, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "@/components/layout/PaginationFooter";

export interface ClientPagination<T> {
    page: number;
    pageCount: number;
    pageItems: T[];
    total: number;
    pageSize: number;
    setPage: (page: number) => void;
}

/**
 * Pages an already-loaded list in the browser. Pair it with
 * `<PaginationFooter {...pagination} onPageChange={pagination.setPage} />`.
 * The current page is clamped, so filtering the list never strands the
 * table on an empty page.
 */
export function useClientPagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE): ClientPagination<T> {
    const [requestedPage, setPage] = useState(1);
    const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
    const page = Math.min(requestedPage, pageCount);

    const pageItems = useMemo(
        () => items.slice((page - 1) * pageSize, page * pageSize),
        [items, page, pageSize],
    );

    return { page, pageCount, pageItems, total: items.length, pageSize, setPage };
}
