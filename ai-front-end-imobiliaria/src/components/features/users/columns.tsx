"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User } from "@/types/user";

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return `${first}${last}`.toUpperCase();
}

export function getColumns(onEdit: (user: User) => void): ColumnDef<User>[] {
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
            header: "Nome",
            cell: ({ row }) => (
                <div className="flex min-w-0 items-center gap-3">
                    <span
                        aria-hidden="true"
                        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs text-primary"
                    >
                        {getInitials(row.original.name)}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">
                            {row.original.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {row.original.email}
                        </p>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "username",
            header: "Usuário",
            cell: ({ row }) => (
                <span className="text-muted-foreground">
                    {row.original.username}
                </span>
            ),
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => {
                const isActive = row.original.is_active;
                return (
                    <Badge variant={isActive ? "success" : "muted"}>
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
                    <span
                        className={cn(
                            "inline-flex items-center gap-1.5 text-xs",
                            isOnline ? "text-success" : "text-muted-foreground"
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className={cn(
                                "size-2 rounded-full",
                                isOnline ? "bg-success" : "bg-muted-foreground/40"
                            )}
                        />
                        {isOnline ? "Online" : "Offline"}
                    </span>
                );
            },
        },
        {
            id: "actions",
            header: () => <span className="sr-only">Ações</span>,
            cell: ({ row }) => {
                const user = row.original;

                return (
                    <div className="flex items-center justify-end gap-0.5">
                        <Button
                            aria-label={`Editar ${user.name}`}
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => onEdit(user)}
                            size="icon-sm"
                            title="Editar"
                            variant="ghost"
                        >
                            <Pencil />
                        </Button>
                    </div>
                );
            },
        },
    ];
}
