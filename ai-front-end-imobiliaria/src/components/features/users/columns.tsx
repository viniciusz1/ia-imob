"use client";

import { ColumnDef } from "@tanstack/react-table";
import { User } from "@/types/user";
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

export function getColumns(onEdit: (user: User) => void): ColumnDef<User>[] {
    return [
        {
            accessorKey: "id",
            header: "Código",
        },
        {
            accessorKey: "name",
            header: "Nome",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium">{row.original.name}</span>
                    <span className="text-sm text-muted-foreground">
                        {row.original.email}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "username",
            header: "Usuário",
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.original.is_active;
                return (
                    <Badge variant={isActive ? "default" : "destructive"}>
                        {isActive ? "Ativo" : "Inativo"}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "is_online",
            header: "Online",
            cell: ({ row }) => {
                const isOnline = row.original.is_online;
                return (
                    <Badge
                        variant="outline"
                        className={
                            isOnline
                                ? "text-green-600 border-green-600"
                                : "text-gray-500"
                        }
                    >
                        {isOnline ? "Online" : "Offline"}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const user = row.original;

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
                                onClick={() => onEdit(user)}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer text-red-600">
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
