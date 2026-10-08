"use client";

import { useState } from "react";
import { Plus, UserCheck, UserX, Users, Wifi } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { UserFilters } from "@/components/features/users/UserFilters";
import { UsersDataTable } from "@/components/features/users/UsersDataTable";
import { UserFormModal } from "@/components/features/users/UserFormModal";
import { User } from "@/types/user";

// =============================================================================
// Props
// =============================================================================

interface UsuariosClientProps {
    initialData: User[];
    pageCount: number;
    /** Itens por página devolvidos pela API (meta.per_page). */
    pageSize?: number;
    /** Total de usuários encontrados com os filtros atuais (meta da API). */
    total?: number;
}

// =============================================================================
// Client Component — Orquestra listagem + modal
// =============================================================================

export function UsuariosClient({ initialData, pageCount, pageSize, total }: UsuariosClientProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const activeCount = initialData.filter((user) => user.is_active).length;
    const inactiveCount = initialData.length - activeCount;
    const onlineCount = initialData.filter((user) => user.is_online).length;
    const isPaginated = pageCount > 1;
    const pageHint = isPaginated ? "Na página atual" : undefined;

    const handleCreate = () => {
        setEditingUser(null);
        setModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setModalOpen(true);
    };

    const handleModalChange = (open: boolean) => {
        setModalOpen(open);
        if (!open) {
            setEditingUser(null);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                actions={(
                    <Button onClick={handleCreate}>
                        <Plus />
                        Novo usuário
                    </Button>
                )}
                description="Gerencie quem acessa o sistema e o que cada pessoa pode fazer."
                title="Usuários"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    hint="Com os filtros aplicados"
                    icon={Users}
                    title="Usuários"
                    tone="primary"
                    value={total ?? initialData.length}
                />
                <StatCard
                    hint={pageHint}
                    icon={UserCheck}
                    title="Ativos"
                    tone="success"
                    value={activeCount}
                />
                <StatCard
                    hint={pageHint}
                    icon={UserX}
                    title="Inativos"
                    tone="warning"
                    value={inactiveCount}
                />
                <StatCard
                    hint={pageHint}
                    icon={Wifi}
                    title="Online agora"
                    tone="info"
                    value={onlineCount}
                />
            </div>

            <UserFilters />

            <UsersDataTable
                data={initialData}
                pageCount={pageCount}
                pageSize={pageSize}
                total={total}
                onEdit={handleEdit}
            />

            <UserFormModal
                open={modalOpen}
                onOpenChange={handleModalChange}
                initialData={editingUser}
            />
        </div>
    );
}
