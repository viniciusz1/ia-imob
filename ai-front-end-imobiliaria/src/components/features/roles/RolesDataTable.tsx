"use client";

import { useMemo } from "react";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { PaginationFooter } from "@/components/layout/PaginationFooter";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useClientPagination } from "@/hooks/useClientPagination";
import { getColumns } from "./columns";
import { Role } from "@/types/role";

interface RolesDataTableProps {
    data: Role[];
    onEdit: (role: Role) => void;
    onDelete: (role: Role) => void;
}

/** The roles API returns every group at once, so the table pages them in the browser. */
export function RolesDataTable({ data, onEdit, onDelete }: RolesDataTableProps) {
    const columns = useMemo(() => getColumns(onEdit, onDelete), [onEdit, onDelete]);
    const pagination = useClientPagination(data);

    // TanStack Table exposes callbacks that React Compiler intentionally leaves unmemoized.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        columns,
        data: pagination.pageItems,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <Card className="gap-0 overflow-hidden py-0">
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
                            <TableRow key={row.id}>
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
                                Nenhum grupo encontrado.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>

            <PaginationFooter
                onPageChange={pagination.setPage}
                page={pagination.page}
                pageCount={pagination.pageCount}
                pageSize={pagination.pageSize}
                total={pagination.total}
            />
        </Card>
    );
}
