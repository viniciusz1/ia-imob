"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
            } catch (error: any) {
                toast.error(error.response?.data?.message || "Não foi possível excluir o grupo.");
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
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Grupos de Usuários</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie os perfis de acesso e permissões do sistema.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Grupo
                </Button>
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
