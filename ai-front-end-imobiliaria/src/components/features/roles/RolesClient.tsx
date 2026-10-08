"use client";

import { useState } from "react";
import { isAxiosError } from "axios";
import { KeyRound, Plus, ShieldAlert, ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
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
    pageCount: number;
}

// =============================================================================
// Client Component — Orquestra listagem + modal
// =============================================================================

export function RolesClient({ initialData, pageCount }: RolesClientProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const deleteMutation = useDeleteRole();

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

    const handleDelete = async (role: Role) => {
        if (confirm(`Tem certeza que deseja excluir o grupo '${role.name}'?`)) {
            try {
                await deleteMutation.mutateAsync(role.id);
                toast.success("Grupo excluído com sucesso.");
            } catch (error: unknown) {
                toast.error(
                    (isAxiosError<{ message?: string }>(error) && error.response?.data?.message) ||
                    "Não foi possível excluir o grupo."
                );
            }
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
                pageCount={pageCount}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />

            <RoleFormModal
                open={modalOpen}
                onOpenChange={handleModalChange}
                initialData={editingRole}
            />
        </div>
    );
}
