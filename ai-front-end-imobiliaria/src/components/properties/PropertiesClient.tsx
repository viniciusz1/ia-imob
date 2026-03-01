"use client";

import Link from "next/link";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteProperty } from "@/hooks/useProperties";
import type { Property } from "@/types/property";
import { Button } from "@/components/ui/button";
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

function formatMoney(value: number | null): string {
    if (value == null) return "-";
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
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
        } catch (error: any) {
            toast.error(error.response?.data?.message ?? "Não foi possível excluir o imóvel.");
        }
    }

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Imóveis</h1>
                    <p className="text-muted-foreground mt-1">Gerencie captações, mídias e publicação.</p>
                </div>
                <Button asChild>
                    <Link href="/properties/create">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Imóvel
                    </Link>
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Ref.</TableHead>
                            <TableHead>Título</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Cidade</TableHead>
                            <TableHead>Venda</TableHead>
                            <TableHead>Locação</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {properties.map((property) => (
                            <TableRow key={property.id}>
                                <TableCell>{property.reference_code}</TableCell>
                                <TableCell className="font-medium">{property.title}</TableCell>
                                <TableCell>{property.property_type}</TableCell>
                                <TableCell>{property.status}</TableCell>
                                <TableCell>{property.city}</TableCell>
                                <TableCell>{formatMoney(property.sale_price)}</TableCell>
                                <TableCell>{formatMoney(property.rent_price)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="outline" size="sm" asChild>
                                            <Link href={`/properties/${property.id}/edit`}>
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => handleDelete(property)}
                                            disabled={deleteMutation.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {properties.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                    Nenhum imóvel cadastrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
