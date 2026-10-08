"use client";

import Link from "next/link";
import { useState } from "react";
import { isAxiosError } from "axios";
import { Building2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteProperty } from "@/hooks/useProperties";
import type { Property } from "@/types/property";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface PropertiesClientProps {
    initialData: Property[];
}

type BadgeVariant = "success" | "warning" | "info" | "muted";

// Values from the "property_statuses" system enum.
const STATUS_BADGES: Record<string, { label: string; variant: BadgeVariant }> = {
    disponivel: { label: "Disponível", variant: "success" },
    reservado: { label: "Reservado", variant: "warning" },
    vendido: { label: "Vendido", variant: "info" },
    locado: { label: "Locado", variant: "info" },
    inativo: { label: "Inativo", variant: "muted" },
};

function humanize(value: string): string {
    const text = value.replace(/_/g, " ").trim();
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatMoney(value: number | null): string {
    if (value == null) return "-";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

function StatusBadge({ status }: { status: string }) {
    const badge = STATUS_BADGES[status];

    if (!badge) {
        return <Badge variant="muted">{status ? humanize(status) : "-"}</Badge>;
    }

    return <Badge variant={badge.variant}>{badge.label}</Badge>;
}

export function PropertiesClient({ initialData }: PropertiesClientProps) {
    const [properties, setProperties] = useState(initialData);
    const deleteMutation = useDeleteProperty();

    async function handleDelete(property: Property) {
        if (!confirm(`Deseja excluir o imóvel "${property.title}"?`)) {
            return;
        }

        try {
            await deleteMutation.mutateAsync(property.id);
            setProperties((current) => current.filter((item) => item.id !== property.id));
            toast.success("Imóvel excluído com sucesso.");
        } catch (error: unknown) {
            toast.error(
                (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
                "Não foi possível excluir o imóvel."
            );
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                actions={(
                    <Button asChild>
                        <Link href="/properties/create">
                            <Plus />
                            Novo imóvel
                        </Link>
                    </Button>
                )}
                description="Gerencie captações, mídias e publicação."
                title="Imóveis"
            />

            <Card className="gap-0 overflow-hidden py-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Imóvel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="hidden lg:table-cell">Site</TableHead>
                            <TableHead className="hidden md:table-cell">Cidade</TableHead>
                            <TableHead className="text-right">Venda</TableHead>
                            <TableHead className="hidden text-right sm:table-cell">Locação</TableHead>
                            <TableHead className="w-px">
                                <span className="sr-only">Ações</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {properties.map((property) => (
                            <TableRow key={property.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Link
                                            className="block max-w-[320px] truncate text-sm text-foreground hover:text-primary hover:underline"
                                            href={`/properties/${property.id}/edit`}
                                        >
                                            {property.title}
                                        </Link>
                                        {property.is_highlighted && (
                                            <Star
                                                aria-label="Em destaque"
                                                className="size-3.5 shrink-0 fill-warning text-warning"
                                            />
                                        )}
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        <span className="tabular-nums">Ref. {property.reference_code}</span>
                                        {property.property_type && ` · ${humanize(property.property_type)}`}
                                    </p>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={property.status} />
                                </TableCell>
                                <TableCell className="hidden lg:table-cell">
                                    <Badge variant={property.is_published ? "success" : "muted"}>
                                        {property.is_published ? "Publicado" : "Não publicado"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                    <p className="text-sm text-foreground">{property.city || "-"}</p>
                                    {property.neighborhood && (
                                        <p className="mt-0.5 text-xs text-muted-foreground">{property.neighborhood}</p>
                                    )}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    {formatMoney(property.sale_price)}
                                </TableCell>
                                <TableCell className="hidden text-right tabular-nums sm:table-cell">
                                    {formatMoney(property.rent_price)}
                                </TableCell>
                                <TableCell className="px-2">
                                    <div className="flex items-center justify-end gap-0.5">
                                        <Button
                                            asChild
                                            className="text-muted-foreground hover:text-foreground"
                                            size="icon-sm"
                                            variant="ghost"
                                        >
                                            <Link
                                                aria-label="Editar"
                                                href={`/properties/${property.id}/edit`}
                                                title="Editar"
                                            >
                                                <Pencil />
                                            </Link>
                                        </Button>
                                        <Button
                                            aria-label="Excluir"
                                            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => void handleDelete(property)}
                                            size="icon-sm"
                                            title="Excluir"
                                            variant="ghost"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {properties.length === 0 && (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7}>
                                    <EmptyState
                                        description="Use o botão Novo imóvel para cadastrar o primeiro."
                                        icon={Building2}
                                        title="Nenhum imóvel cadastrado."
                                        variant="inline"
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
