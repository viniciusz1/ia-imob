import { CircleAlert } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPaginatedRoles } from "@/services/roleService";
import { RolesClient } from "@/components/features/roles/RolesClient";
import type { PaginatedRolesResponse } from "@/types/role";

export const dynamic = 'force-dynamic';

// =============================================================================
// Server Component - Grupos de Usuários Page
// =============================================================================

export default async function GruposPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const resolvedParams = await searchParams;
    const page = Number(resolvedParams.page) || 1;

    let response: PaginatedRolesResponse;

    try {
        response = await getPaginatedRoles(page);
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
        <RolesClient
            initialData={response.data}
            pageCount={response.meta?.last_page || 1}
        />
    );
}
