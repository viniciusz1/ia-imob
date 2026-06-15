import { listAgencies } from "@/services/adminApi";
import { AgenciesClient } from "@/components/features/admin/agencies/AgenciesClient";

export default async function AdminAgenciesPage() {
    const agencies = await listAgencies();

    return <AgenciesClient initialData={agencies} />;
}
