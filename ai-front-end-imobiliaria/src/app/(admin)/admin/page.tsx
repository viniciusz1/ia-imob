import { PlatformOverviewClient } from "@/components/features/admin/overview/PlatformOverviewClient";
import { listAgencies, type AgencySummary } from "@/services/adminApi";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
    let agencies: AgencySummary[] | null = null;

    try {
        agencies = await listAgencies();
    } catch {
        agencies = null;
    }

    if (agencies === null) {
        return (
            <div className="p-6">
                <h1 className="text-2xl font-semibold tracking-tight">Visão geral da plataforma</h1>
                <p className="mt-2 text-sm text-destructive">
                    Não foi possível carregar as agências. Verifique se a API está online e recarregue a
                    página.
                </p>
            </div>
        );
    }

    return <PlatformOverviewClient agencies={agencies} />;
}
