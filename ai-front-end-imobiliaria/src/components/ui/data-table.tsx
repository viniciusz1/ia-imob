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
    <div className="space-y-4">
      <div className="rounded-md border bg-card text-card-foreground">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
              <TableRow>
                <TableCell className="h-24 text-center text-muted-foreground" colSpan={columns.length}>
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex-1 text-sm text-muted-foreground">
          Mostrando página {currentPage} de {normalizedPageCount}
        </div>
        <div className="flex items-center space-x-2">
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
