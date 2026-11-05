"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { KeyRound, Loader2, Plus, ShieldAlert, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RolesDataTable } from "@/components/features/roles/RolesDataTable";
import { RoleFormModal } from "@/components/features/roles/RoleFormModal";
import { Role } from "@/types/role";
import { useDeleteRole } from "@/hooks/useRoles";
import { toast } from "sonner";

// =============================================================================
// Props
// =============================================================================

interface RolesClientProps {
    initialData: Role[];
}

// =============================================================================
// Client Component — Orquestra listagem + modal
// =============================================================================

export function RolesClient({ initialData }: RolesClientProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const deleteMutation = useDeleteRole();
    const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

    const permissionsInUse = new Set(
        initialData.flatMap((role) => (role.permissions || []).map((permission) => permission.id))
    ).size;
    const rolesWithoutPermissions = initialData.filter(
        (role) => (role.permissions || []).length === 0
    ).length;

    const handleCreate = () => {
        setEditingRole(null);
        setModalOpen(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setModalOpen(true);
    };

    const handleDelete = (role: Role) => {
        setPendingDelete(role);
    };

    const confirmDelete = async (role: Role) => {
        try {
            await deleteMutation.mutateAsync(role.id);
            toast.success("Grupo excluído com sucesso.");
        } catch (error: unknown) {
            toast.error(
                (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
                "Não foi possível excluir o grupo."
            );
        } finally {
            setPendingDelete(null);
        }
    };

    const handleModalChange = (open: boolean) => {
        setModalOpen(open);
        if (!open) {
            setEditingRole(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                actions={(
                    <Button onClick={handleCreate}>
                        <Plus />
                        Novo grupo
                    </Button>
                )}
                description="Gerencie os perfis de acesso e permissões do sistema."
                title="Grupos de usuários"
            />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                    icon={ShieldCheck}
                    title="Grupos"
                    tone="primary"
                    value={initialData.length}
                />
                <StatCard
                    hint="Permissões distintas atribuídas a algum grupo"
                    icon={KeyRound}
                    title="Permissões em uso"
                    tone="info"
                    value={permissionsInUse}
                />
                <StatCard
                    hint="Usuários desses grupos não acessam nenhum módulo"
                    icon={ShieldAlert}
                    title="Grupos sem permissão"
                    tone={rolesWithoutPermissions > 0 ? "warning" : "success"}
                    value={rolesWithoutPermissions}
                />
            </div>

            <RolesDataTable
                data={initialData}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <RoleFormModal
                open={modalOpen}
                onOpenChange={handleModalChange}
                initialData={editingRole}
            />

            <AlertDialog
                onOpenChange={(open) => {
                    if (!open && !deleteMutation.isPending) setPendingDelete(null);
                }}
                open={pendingDelete !== null}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir grupo?</AlertDialogTitle>
                        <AlertDialogDescription>
                            O grupo &quot;{pendingDelete?.name}&quot; será excluído. Essa ação não pode ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={deleteMutation.isPending}
                            onClick={(event) => {
                                // Keep the dialog open until the API answers.
                                event.preventDefault();
                                if (pendingDelete) void confirmDelete(pendingDelete);
                            }}
                            variant="destructive"
                        >
                            {deleteMutation.isPending && <Loader2 className="animate-spin" />}
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
