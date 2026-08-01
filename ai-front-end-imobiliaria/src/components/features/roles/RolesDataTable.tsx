"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { getColumns } from "./columns";
import { Role } from "@/types/role";

interface RolesDataTableProps {
    data: Role[];
    pageCount: number;
    onEdit: (role: Role) => void;
    onDelete: (role: Role) => void;
}

export function RolesDataTable({ data, pageCount, onEdit, onDelete }: RolesDataTableProps) {
    const columns = useMemo(() => getColumns(onEdit, onDelete), [onEdit, onDelete]);

    return (
        <DataTable
            columns={columns}
            data={data}
            emptyMessage="Nenhum grupo encontrado."
            pageCount={pageCount}
        />
    );
}
