"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCount } from "./format";

export const PAGE_SIZE = 20;

export interface PagedItems<T> {
  pageItems: T[];
  page: number;
  pageCount: number;
  total: number;
  /** Index of the first visible item, so callers can keep ranking numbers continuous. */
  firstIndex: number;
  goToPage: (page: number) => void;
}

export function usePagedItems<T>(items: T[], pageSize: number = PAGE_SIZE): PagedItems<T> {
  const [requestedPage, setRequestedPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  // The filters can shrink a list while a later page is open, so clamp on render
  // instead of trusting the stored page.
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const firstIndex = (page - 1) * pageSize;

  return {
    pageItems: items.slice(firstIndex, firstIndex + pageSize),
    page,
    pageCount,
    total: items.length,
    firstIndex,
    goToPage: setRequestedPage,
  };
}

interface PaginationFooterProps<T> {
  paged: PagedItems<T>;
  noun: string;
}

export function PaginationFooter<T>({ paged, noun }: PaginationFooterProps<T>) {
  if (paged.pageCount <= 1) return null;

  const from = paged.firstIndex + 1;
  const to = paged.firstIndex + paged.pageItems.length;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground tabular-nums">
        {from}-{to} de {formatCount(paged.total)} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          disabled={paged.page <= 1}
          onClick={() => paged.goToPage(paged.page - 1)}
          size="sm"
          variant="outline"
        >
          Anterior
        </Button>
        <Button
          disabled={paged.page >= paged.pageCount}
          onClick={() => paged.goToPage(paged.page + 1)}
          size="sm"
          variant="outline"
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
