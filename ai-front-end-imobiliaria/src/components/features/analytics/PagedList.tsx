"use client";

import { useState } from "react";
import {
  DEFAULT_PAGE_SIZE,
  PaginationFooter as SharedPaginationFooter,
} from "@/components/layout/PaginationFooter";

export const PAGE_SIZE = DEFAULT_PAGE_SIZE;

export interface PagedItems<T> {
  pageItems: T[];
  page: number;
  pageCount: number;
  pageSize: number;
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
    pageSize,
    total: items.length,
    firstIndex,
    goToPage: setRequestedPage,
  };
}

interface PaginationFooterProps<T> {
  paged: PagedItems<T>;
  noun: string;
}

/** Rodapé padrão do card; aparece sempre, mesmo quando tudo cabe numa página. */
export function PaginationFooter<T>({ paged, noun }: PaginationFooterProps<T>) {
  return (
    <SharedPaginationFooter
      itemLabel={noun}
      onPageChange={paged.goToPage}
      page={paged.page}
      pageCount={paged.pageCount}
      pageSize={paged.pageSize}
      total={paged.total}
    />
  );
}
