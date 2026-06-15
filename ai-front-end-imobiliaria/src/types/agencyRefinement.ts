import type { AgencyConfig } from "@/types/agencyConfig";

export interface AgencyEvidenceHtml {
    id: number;
    url: string;
    sample_index: number;
    captured_at: string | null;
}

export interface AgencyExtractorRefinement {
    agency: AgencyConfig;
    evidence_available: boolean;
    evidence: AgencyEvidenceHtml[];
}
