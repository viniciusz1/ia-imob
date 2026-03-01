import { getPaginatedRoles } from "@/services/roles";
import { RolesClient } from "@/components/features/roles/RolesClient";

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

    try {
        const response = await getPaginatedRoles(page);

        return (
            <RolesClient
                initialData={response.data}
                pageCount={response.meta?.last_page || 1}
            />
        );
    } catch (error) {
        // Fallback básico para erro de API
        return (
            <div className="container mx-auto py-8 text-center text-red-500 mt-20">
                <h1 className="text-2xl font-bold mb-4">Erro ao carregar grupos</h1>
                <p>Verifique sua conexão ou se a API está online.</p>
            </div>
        );
    }
}
