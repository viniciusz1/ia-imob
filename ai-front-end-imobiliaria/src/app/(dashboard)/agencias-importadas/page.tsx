import { AgencyConfigsClient } from "@/components/features/agency-configs/AgencyConfigsClient";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Agências importadas",
};

export default function AgenciasImportadasPage() {
    return <AgencyConfigsClient />;
}
