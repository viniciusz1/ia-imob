import { useQuery } from "@tanstack/react-query";

import { previewExtractorRefinement } from "@/services/cadastradorService";
import type { AgencyFieldExtractor } from "@/types/agencyConfig";
import type {
    AgencyEvidenceHtml,
    ExtractorRefinementPreview,
    ExtractorRefinementPreviewRequest,
} from "@/types/agencyRefinement";

export const EXTRACTOR_REFINEMENT_PREVIEW_QUERY_KEY = ["extractor-refinement-preview"];

interface UseExtractorRefinementPreviewParams {
    fieldName: string | null;
    extractors: AgencyFieldExtractor[];
    evidence: AgencyEvidenceHtml[];
    enabled: boolean;
}

export function useExtractorRefinementPreview({
    fieldName,
    extractors,
    evidence,
    enabled,
}: UseExtractorRefinementPreviewParams) {
    return useQuery<ExtractorRefinementPreview>({
        queryKey: [
            ...EXTRACTOR_REFINEMENT_PREVIEW_QUERY_KEY,
            fieldName,
            extractors.map((extractor) => ({
                id: extractor.id,
                priority: extractor.priority,
                source_type: extractor.source_type,
                selector_value: extractor.selector_value,
                selector_index: extractor.selector_index,
                selector_join: extractor.selector_join,
                pipeline: extractor.pipeline,
                output_type: extractor.output_type,
            })),
            evidence.map((item) => ({
                id: item.id,
                content_hash: item.content_hash,
            })),
        ],
        queryFn: () => previewExtractorRefinement(toPreviewRequest(fieldName ?? "", extractors, evidence)),
        enabled: enabled && Boolean(fieldName) && extractors.length > 0 && evidence.length > 0,
    });
}

function toPreviewRequest(
    fieldName: string,
    extractors: AgencyFieldExtractor[],
    evidence: AgencyEvidenceHtml[],
): ExtractorRefinementPreviewRequest {
    return {
        field_name: fieldName,
        extractors: extractors.map((extractor) => ({
            field_name: extractor.field_name,
            source_type: extractor.source_type,
            selector_value: extractor.selector_value,
            selector_index: extractor.selector_index,
            selector_join: extractor.selector_join,
            pipeline: extractor.pipeline,
            output_type: extractor.output_type,
            priority: extractor.priority,
            is_optional: extractor.is_optional,
        })),
        evidence: evidence.map((item) => ({
            id: item.id,
            sample_index: item.sample_index,
            url: item.url,
            html: item.html,
        })),
    };
}
