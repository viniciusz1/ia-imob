import type { AgencyConfig, AgencyFieldExtractor, ExtractorOutputType, ExtractorSourceType } from "@/types/agencyConfig";

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

export interface ExtractorRefinementSaveExtractor {
    id?: number;
    field_name: string;
    source_type: ExtractorSourceType;
    selector_value: string;
    selector_index: number | null;
    selector_join: boolean;
    selector_params: Record<string, unknown> | null;
    pipeline: string | null;
    output_type: ExtractorOutputType;
    priority: number;
    is_optional: boolean;
}

export interface ExtractorRefinementSaveRequest {
    field_name: string;
    extractors: ExtractorRefinementSaveExtractor[];
}

export interface ExtractorRefinementSaveResponse {
    agency: AgencyConfig;
    extractors: AgencyFieldExtractor[];
}
