"use client";

import {
  flexRender,
  getCoreRowModel,
  type ColumnDef,
  useReactTable,
} from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyMessage: string;
  pageCount: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  emptyMessage,
  pageCount,
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizedPageCount = Math.max(1, pageCount);
  const requestedPage = Number(searchParams.get("page"));
  const currentPage = Number.isInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, normalizedPageCount)
    : 1;

  // TanStack Table exposes callbacks that React Compiler intentionally leaves unmemoized.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    columns,
    data,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: normalizedPageCount,
  });

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs shadow-black/[0.03]">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <TableRow data-state={row.getIsSelected() ? "selected" : undefined} key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell className="h-24 text-center text-muted-foreground" colSpan={columns.length}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <p className="text-sm text-muted-foreground tabular-nums">
          Mostrando página {currentPage} de {normalizedPageCount}
        </p>
        <div className="flex items-center gap-2">
          <Button
            disabled={currentPage <= 1}
            onClick={() => handlePageChange(currentPage - 1)}
            size="sm"
            variant="outline"
          >
            Anterior
          </Button>
          <Button
            disabled={currentPage >= normalizedPageCount}
            onClick={() => handlePageChange(currentPage + 1)}
            size="sm"
            variant="outline"
          >
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
