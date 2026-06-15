import { useQuery } from "@tanstack/react-query";

import { getAgencyExtractorRefinement } from "@/services/agencyConfigService";
import type { AgencyType } from "@/types/agencyConfig";

export const AGENCY_EXTRACTOR_REFINEMENT_QUERY_KEY = ["agency-extractor-refinement"];

export function useAgencyExtractorRefinement(agencyType: AgencyType, agencyId: number) {
    return useQuery({
        queryKey: [...AGENCY_EXTRACTOR_REFINEMENT_QUERY_KEY, agencyType, agencyId],
        queryFn: () => getAgencyExtractorRefinement(agencyType, agencyId),
        enabled: agencyId > 0,
    });
}
