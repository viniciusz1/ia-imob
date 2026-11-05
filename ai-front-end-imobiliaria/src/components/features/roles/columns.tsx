"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Role } from "@/types/role";

export function getColumns(
    onEdit: (role: Role) => void,
    onDelete?: (role: Role) => void
): ColumnDef<Role>[] {
    return [
        {
            accessorKey: "id",
            header: "Código",
            cell: ({ row }) => (
                <span className="text-muted-foreground tabular-nums">
                    {row.original.id}
                </span>
            ),
        },
        {
            accessorKey: "name",
            header: "Nome do Grupo",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                    >
                        <ShieldCheck className="size-4" />
                    </span>
                    <span className="text-sm text-foreground">
                        {row.original.name}
                    </span>
                </div>
            ),
        },
        {
            id: "permissions",
            header: "Permissões",
            cell: ({ row }) => {
                const permissions = row.original.permissions || [];

                if (permissions.length === 0) {
                    return <Badge variant="warning">Nenhuma permissão</Badge>;
                }

                return (
                    <Badge className="tabular-nums" variant="info">
                        {permissions.length} {permissions.length === 1 ? "permissão" : "permissões"}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Ações</span>,
            cell: ({ row }) => {
                const role = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        <Button
                            aria-label={`Editar ${role.name}`}
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(role)}
                            size="icon-sm"
                            title="Editar"
                            variant="ghost"
                        >
                            <Pencil />
                        </Button>
                        {onDelete && (
                            <Button
                                aria-label={`Excluir ${role.name}`}
                                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => onDelete(role)}
                                size="icon-sm"
                                title="Excluir"
                                variant="ghost"
                            >
                                <Trash2 />
                            </Button>
                        )}
                    </div>
                );
            },
        },
    ];
}
