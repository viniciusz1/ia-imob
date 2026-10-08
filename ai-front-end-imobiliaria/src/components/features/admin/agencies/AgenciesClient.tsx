"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { CircleAlert, Landmark, Pencil, Plus, Power, PowerOff } from "lucide-react";

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
        <Badge variant={isActive ? "success" : "muted"}>
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
        <div className="space-y-6">
            <PageHeader
                actions={(
                    <Button asChild>
                        <Link href="/admin/agencies/new">
                            <Plus />
                            Nova agência
                        </Link>
                    </Button>
                )}
                description="Gerencie as imobiliárias cadastradas na plataforma."
                title="Agências"
            />

            <Card className="gap-0 overflow-hidden py-0">
                {isLoading && <AgenciesTableSkeleton />}
                {error && (
                    <EmptyState
                        description="Tente novamente em instantes."
                        icon={CircleAlert}
                        title="Erro ao carregar agências."
                        variant="inline"
                    />
                )}
                {!isLoading && !error && (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Agência</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="hidden md:table-cell">Criada em</TableHead>
                                <TableHead className="w-px">
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agencies?.map((agency) => (
                                <TableRow key={agency.id}>
                                    <TableCell>
                                        <Link
                                            className="block max-w-[320px] truncate text-sm text-foreground hover:text-primary hover:underline"
                                            href={`/admin/agencies/${agency.id}`}
                                        >
                                            {agency.name}
                                        </Link>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{agency.slug}</p>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge isActive={agency.is_active} />
                                    </TableCell>
                                    <TableCell className="hidden text-muted-foreground tabular-nums md:table-cell">
                                        {formatDate(agency.created_at)}
                                    </TableCell>
                                    <TableCell className="px-2">
                                        <div className="flex items-center justify-end gap-0.5">
                                            {canUpdate && (
                                                <Button
                                                    aria-label="Editar"
                                                    className="text-muted-foreground hover:text-foreground"
                                                    onClick={() => handleEdit(agency)}
                                                    size="icon-sm"
                                                    title="Editar"
                                                    variant="ghost"
                                                >
                                                    <Pencil />
                                                </Button>
                                            )}
                                            {canDeactivate && (agency.is_active ? (
                                                <Button
                                                    aria-label="Desativar"
                                                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    disabled={isPending}
                                                    onClick={() => void handleDeactivate(agency)}
                                                    size="icon-sm"
                                                    title="Desativar"
                                                    variant="ghost"
                                                >
                                                    <PowerOff />
                                                </Button>
                                            ) : (
                                                <Button
                                                    aria-label="Ativar"
                                                    className="text-muted-foreground hover:bg-success/10 hover:text-success"
                                                    disabled={isPending}
                                                    onClick={() => void handleActivate(agency)}
                                                    size="icon-sm"
                                                    title="Ativar"
                                                    variant="ghost"
                                                >
                                                    <Power />
                                                </Button>
                                            ))}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {agencies?.length === 0 && (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell colSpan={4}>
                                        <EmptyState
                                            description="Use o botão Nova agência para cadastrar a primeira."
                                            icon={Landmark}
                                            title="Nenhuma agência cadastrada."
                                            variant="inline"
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
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
        <div className="divide-y">
            {Array.from({ length: 4 }, (_, index) => (
                <div className="flex items-center gap-4 px-4 py-4" key={index}>
                    <div className="space-y-2">
                        <Skeleton className="h-3.5 w-48" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="ml-auto h-5 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}
