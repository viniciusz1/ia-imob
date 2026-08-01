"use client";

import { useMemo } from "react";
import { DataTable } from "@/components/ui/data-table";
import { getColumns } from "./columns";
import { User } from "@/types/user";

interface UsersDataTableProps {
    data: User[];
    pageCount: number;
    onEdit: (user: User) => void;
}

export function UsersDataTable({ data, pageCount, onEdit }: UsersDataTableProps) {
    const columns = useMemo(() => getColumns(onEdit), [onEdit]);

    return (
        <DataTable
            columns={columns}
            data={data}
            emptyMessage="Nenhum usuário encontrado."
            pageCount={pageCount}
        />
    );
}
