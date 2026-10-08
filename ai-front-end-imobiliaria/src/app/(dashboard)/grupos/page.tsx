import { CircleAlert } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { getRoles } from "@/services/roleService";
import { RolesClient } from "@/components/features/roles/RolesClient";
import type { Role } from "@/types/role";

export const dynamic = 'force-dynamic';

// =============================================================================
// Server Component - Grupos de Usuários Page
// =============================================================================

export default async function GruposPage() {
    // The API returns every group at once; the table pages them in the browser.
    let roles: Role[];

    try {
        roles = await getRoles();
    } catch {
        // Fallback básico para erro de API
        return (
            <div className="space-y-6">
                <PageHeader
                    description="Gerencie os perfis de acesso e permissões do sistema."
                    title="Grupos de usuários"
                />
                <EmptyState
                    description="Verifique sua conexão ou se a API está online."
                    icon={CircleAlert}
                    title="Erro ao carregar grupos"
                />
            </div>
        );
    }

    return (
        <RolesClient initialData={roles} />
    );
}
