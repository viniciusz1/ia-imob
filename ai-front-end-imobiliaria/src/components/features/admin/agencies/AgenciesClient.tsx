"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Edit, Power, PowerOff, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    useActivateAgency,
    useAdminAgencies,
    useDeactivateAgency,
} from "@/hooks/useAdminAgencies";
import { usePermission } from "@/hooks/usePermission";
import { AgencyFormModal } from "./AgencyFormModal";
import type { AgencySummary } from "@/services/adminApi";

interface AgenciesClientProps {
    initialData: AgencySummary[];
}

function formatDate(date: string | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
}

function StatusBadge({ isActive }: { isActive: boolean }) {
    return (
        <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Ativa" : "Inativa"}
        </Badge>
    );
}

function useStatusActions() {
    const activate = useActivateAgency();
    const deactivate = useDeactivateAgency();

    const handleActivate = async (agency: AgencySummary) => {
        try {
            await activate.mutateAsync(agency.id);
            toast.success(`Agência "${agency.name}" ativada.`);
        } catch {
            toast.error("Não foi possível ativar a agência.");
        }
    };

    const handleDeactivate = async (agency: AgencySummary) => {
        try {
            await deactivate.mutateAsync(agency.id);
            toast.success(`Agência "${agency.name}" desativada.`);
        } catch {
            toast.error("Não foi possível desativar a agência.");
        }
    };

    return {
        handleActivate,
        handleDeactivate,
        isPending: activate.isPending || deactivate.isPending,
    };
}

export function AgenciesClient({ initialData }: AgenciesClientProps) {
    const { data: agencies, isLoading, error } = useAdminAgencies(initialData);
    const canDeactivate = usePermission("platform.agencies.deactivate");
    const canUpdate = usePermission("platform.agencies.update");
    const { handleActivate, handleDeactivate, isPending } = useStatusActions();

    const [modalOpen, setModalOpen] = useState(false);
    const [editingAgency, setEditingAgency] = useState<AgencySummary | null>(null);

    const handleEdit = (agency: AgencySummary) => {
        setEditingAgency(agency);
        setModalOpen(true);
    };

    const handleModalChange = (open: boolean) => {
        setModalOpen(open);
        if (!open) {
            setEditingAgency(null);
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Agências</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie as imobiliárias cadastradas na plataforma.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/agencies/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Agência
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listagem</CardTitle>
                    <CardDescription>
                        Visualize, edite e controle o status das agências.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading && <AgenciesTableSkeleton />}
                    {error && (
                        <p className="text-sm text-red-600">
                            Erro ao carregar agências. Tente novamente.
                        </p>
                    )}
                    {!isLoading && !error && (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Slug</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Criada em</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agencies?.map((agency) => (
                                        <TableRow key={agency.id}>
                                            <TableCell>{agency.id}</TableCell>
                                            <TableCell>
                                                <Link
                                                    href={`/admin/agencies/${agency.id}`}
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    {agency.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{agency.slug}</TableCell>
                                            <TableCell>
                                                <StatusBadge isActive={agency.is_active} />
                                            </TableCell>
                                            <TableCell>{formatDate(agency.created_at)}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canUpdate && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(agency)}
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </Button>
                                                    )}
                                                    {canDeactivate && (
                                                        <>
                                                            {agency.is_active ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => void handleDeactivate(agency)}
                                                                    disabled={isPending}
                                                                >
                                                                    <PowerOff className="mr-2 h-4 w-4" />
                                                                    Desativar
                                                                </Button>
                                                            ) : (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => void handleActivate(agency)}
                                                                    disabled={isPending}
                                                                >
                                                                    <Power className="mr-2 h-4 w-4" />
                                                                    Ativar
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {agencies?.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                Nenhuma agência cadastrada.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AgencyFormModal
                open={modalOpen}
                onOpenChange={handleModalChange}
                agency={editingAgency}
            />
        </div>
    );
}

function AgenciesTableSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
        </div>
    );
}
