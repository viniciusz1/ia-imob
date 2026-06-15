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

export interface ExtractorRefinementPreviewExtractor {
    field_name: string;
    source_type: ExtractorSourceType;
    selector_value: string;
    selector_index: number | null;
    selector_join: boolean;
    pipeline: string | null;
    output_type: ExtractorOutputType;
    priority: number;
    is_optional: boolean;
}

export interface ExtractorRefinementPreviewEvidence {
    id: number;
    sample_index: number;
    url: string;
    html: string;
}

export interface ExtractorRefinementPreviewRequest {
    field_name: string;
    extractors: ExtractorRefinementPreviewExtractor[];
    evidence: ExtractorRefinementPreviewEvidence[];
}

export type ExtractorRefinementPreviewStatus = "extraiu valor" | "sem valor" | "erro";

export interface ExtractorSelectedEvidence {
    kind: string;
    source_type: ExtractorSourceType;
    selector_value: string;
    matches_count: number;
    selected_indexes: number[];
    fragments: string[];
    json_path?: string;
    script_index?: number;
}

export interface ExtractorRefinementPreviewResult {
    evidence_id: number;
    sample_index: number;
    url: string;
    status: ExtractorRefinementPreviewStatus;
    value: string | null;
    used_priority: number | null;
    selected_evidence: ExtractorSelectedEvidence | null;
    error?: string;
}

export interface ExtractorRefinementPreview {
    results: ExtractorRefinementPreviewResult[];
}
