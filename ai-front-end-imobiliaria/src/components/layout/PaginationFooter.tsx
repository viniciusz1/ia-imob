"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DEFAULT_PAGE_SIZE = 10;

interface PaginationFooterProps {
    /** 1-based current page. */
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
    /** Total of items; when given, the summary reads "Exibindo 11–20 de 57". */
    total?: number;
    pageSize?: number;
    /** Noun for the summary, e.g. "imóveis". */
    itemLabel?: string;
    className?: string;
}

type PageSlot = number | "gap-start" | "gap-end";

/** First, last and current ±1, with gaps marked between them. */
export function visiblePages(page: number, pageCount: number): PageSlot[] {
    const pages = new Set([1, pageCount, page - 1, page, page + 1]);
    const sorted = [...pages].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b);
    const slots: PageSlot[] = [];

    sorted.forEach((value, index) => {
        const previous = sorted[index - 1];
        if (previous !== undefined && value - previous > 1) {
            slots.push(value < page ? "gap-start" : "gap-end");
        }
        slots.push(value);
    });

    return slots;
}

/**
 * Pagination row at the bottom of a table card: item summary on the left,
 * previous/next with page numbers on the right.
 */
export function PaginationFooter({
    page,
    pageCount,
    onPageChange,
    total,
    pageSize = DEFAULT_PAGE_SIZE,
    itemLabel,
    className,
}: PaginationFooterProps) {
    const lastPage = Math.max(1, pageCount);
    const current = Math.min(Math.max(1, page), lastPage);
    const first = total === undefined || total === 0 ? 0 : (current - 1) * pageSize + 1;
    const last = total === undefined ? 0 : Math.min(current * pageSize, total);

    return (
        <div
            className={cn(
                "flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5",
                className,
            )}
        >
            <p className="text-sm text-muted-foreground tabular-nums">
                {total === undefined ? (
                    <>
                        Página <span className="text-foreground">{current}</span> de{" "}
                        <span className="text-foreground">{lastPage}</span>
                    </>
                ) : (
                    <>
                        <span className="hidden sm:inline">Exibindo </span>
                        <span className="text-foreground">
                            {first}–{last}
                        </span>{" "}
                        de <span className="text-foreground">{total}</span>
                        {itemLabel && ` ${itemLabel}`}
                    </>
                )}
            </p>

            <nav aria-label="Paginação" className="flex items-center gap-1">
                <Button
                    disabled={current <= 1}
                    onClick={() => onPageChange(current - 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                >
                    <ChevronLeft />
                    Anterior
                </Button>

                <div className="hidden items-center gap-1 sm:flex">
                    {visiblePages(current, lastPage).map((slot) =>
                        typeof slot === "number" ? (
                            <Button
                                aria-current={slot === current ? "page" : undefined}
                                aria-label={`Página ${slot}`}
                                className={cn("tabular-nums", slot !== current && "text-muted-foreground")}
                                key={slot}
                                onClick={() => onPageChange(slot)}
                                size="icon-sm"
                                type="button"
                                variant={slot === current ? "default" : "ghost"}
                            >
                                {slot}
                            </Button>
                        ) : (
                            <span className="w-8 text-center text-sm text-muted-foreground" key={slot}>
                                …
                            </span>
                        ),
                    )}
                </div>

                <span className="px-2 text-sm text-muted-foreground tabular-nums sm:hidden">
                    {current} / {lastPage}
                </span>

                <Button
                    disabled={current >= lastPage}
                    onClick={() => onPageChange(current + 1)}
                    size="sm"
                    type="button"
                    variant="outline"
                >
                    Próxima
                    <ChevronRight />
                </Button>
            </nav>
        </div>
    );
}
