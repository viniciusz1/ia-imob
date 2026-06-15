import { notFound } from "next/navigation";

import { ExtractorRefinementClient } from "@/components/features/agency-configs/ExtractorRefinementClient";
import type { AgencyType } from "@/types/agencyConfig";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Verificar extratores",
};

interface VerifyExtractorsPageProps {
    params: Promise<{
        agencyType: string;
        agencyId: string;
    }>;
}

const AGENCY_TYPES: AgencyType[] = ["sitemap", "wsm"];

export default async function VerifyExtractorsPage({ params }: VerifyExtractorsPageProps) {
    const { agencyType, agencyId } = await params;
    const parsedAgencyId = Number(agencyId);

    if (!AGENCY_TYPES.includes(agencyType as AgencyType) || !parsedAgencyId) {
        notFound();
    }

    return (
        <ExtractorRefinementClient
            agencyType={agencyType as AgencyType}
            agencyId={parsedAgencyId}
        />
    );
}
