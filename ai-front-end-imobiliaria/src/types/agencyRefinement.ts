import type { AgencyConfig } from "@/types/agencyConfig";

export interface AgencyEvidenceHtml {
    id: number;
    attempt_id: number;
    url: string;
    sample_index: number;
    content_hash: string;
    html: string;
    captured_at: string | null;
}

export interface AgencyExtractorRefinement {
    agency: AgencyConfig;
    evidence_available: boolean;
    evidence: AgencyEvidenceHtml[];
}
