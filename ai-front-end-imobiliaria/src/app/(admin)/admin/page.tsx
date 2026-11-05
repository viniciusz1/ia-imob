import { CircleAlert } from "lucide-react";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
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
            <div className="space-y-6">
                <PageHeader title="Visão geral da plataforma" />
                <EmptyState
                    description="Verifique se a API está online e recarregue a página."
                    icon={CircleAlert}
                    title="Não foi possível carregar as agências"
                />
            </div>
        );
    }

    return <PlatformOverviewClient agencies={agencies} />;
}
