"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
}

// =============================================================================
// Client Component — Orquestra listagem + modal
// =============================================================================

export function UsuariosClient({ initialData, pageCount }: UsuariosClientProps) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

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
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Usuários</h1>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Usuário
                </Button>
            </div>

            <UserFilters />

            <UsersDataTable
                data={initialData}
                pageCount={pageCount}
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
