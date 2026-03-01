"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Role } from "@/types/role";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, MoreHorizontal, Trash } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function getColumns(
    onEdit: (role: Role) => void,
    onDelete?: (role: Role) => void
): ColumnDef<Role>[] {
    return [
        {
            accessorKey: "id",
            header: "Código",
        },
        {
            accessorKey: "name",
            header: "Nome do Grupo",
            cell: ({ row }) => (
                <span className="font-medium">{row.original.name}</span>
            ),
        },
        {
            id: "permissions",
            header: "Permissões",
            cell: ({ row }) => {
                const permissions = row.original.permissions || [];
                const displayCount = 3;

                return (
                    <div className="flex flex-wrap gap-1">
                        {permissions.slice(0, displayCount).map(p => (
                            <Badge key={p.id} variant="secondary" className="text-xs">
                                {p.name}
                            </Badge>
                        ))}
                        {permissions.length > displayCount && (
                            <Badge variant="outline" className="text-xs">
                                +{permissions.length - displayCount}
                            </Badge>
                        )}
                        {permissions.length === 0 && (
                            <span className="text-sm text-muted-foreground">Nenhuma permissão</span>
                        )}
                    </div>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const role = row.original;

                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Abrir menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => onEdit(role)}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="cursor-pointer text-red-600"
                                onClick={() => onDelete && onDelete(role)}
                            >
                                <Trash className="mr-2 h-4 w-4" />
                                Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
}
