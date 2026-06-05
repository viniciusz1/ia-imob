export type AgencyType = "sitemap" | "wsm";
export type ExtractorSourceType = "xpath" | "css" | "og" | "jsonld" | "literal";
export type ExtractorOutputType = "text" | "number" | "boolean" | "image_url" | "link_url";

export interface AgencyFieldExtractor {
    id: number;
    agency_type: AgencyType;
    agency_id: number;
    field_name: string;
    priority: number;
    source_type: ExtractorSourceType;
    selector_value: string;
    selector_index: number | null;
    selector_params: Record<string, unknown> | null;
    selector_join: boolean;
    pipeline: string | null;
    output_type: ExtractorOutputType;
    is_optional: boolean;
    created_at?: string;
    updated_at?: string;
}

interface AgencyBase {
    id: number;
    agency_type: AgencyType;
    name: string;
    domain: string | null;
    is_active: boolean;
    expected_min_items: number | null;
    extractors: AgencyFieldExtractor[];
    created_at?: string;
    updated_at?: string;
}

export interface SitemapAgencyConfig extends AgencyBase {
    agency_type: "sitemap";
    domain: string;
    sitemap_url: string;
    allowed_url_patterns: string | null;
}

export interface WsmAgencyConfig extends AgencyBase {
    agency_type: "wsm";
    url: string;
    url_pagination_template: string;
    total_pages_selector_type: ExtractorSourceType;
    total_pages_selector_value: string;
    total_pages_formula: string | null;
    cards_to_iterate_selector_type: ExtractorSourceType;
    cards_to_iterate_selector_value: string;
}

export type AgencyConfig = SitemapAgencyConfig | WsmAgencyConfig;

export interface AgencyConfigsResponse {
    sitemap_agencies: SitemapAgencyConfig[];
    wsm_agencies: WsmAgencyConfig[];
}

export type SitemapAgencyPayload = {
    name: string;
    domain: string;
    sitemap_url: string;
    allowed_url_patterns: string | null;
    is_active: boolean;
    expected_min_items: number | null;
};

export type WsmAgencyPayload = {
    name: string;
    domain: string | null;
    url: string;
    url_pagination_template: string;
    total_pages_selector_type: ExtractorSourceType;
    total_pages_selector_value: string;
    total_pages_formula: string | null;
    cards_to_iterate_selector_type: ExtractorSourceType;
    cards_to_iterate_selector_value: string;
    is_active: boolean;
    expected_min_items: number | null;
};

export type AgencyPayload = SitemapAgencyPayload | WsmAgencyPayload;

export type AgencyFieldExtractorPayload = {
    field_name: string;
    priority: number;
    source_type: ExtractorSourceType;
    selector_value: string;
    selector_index: number | null;
    selector_params: Record<string, unknown> | null;
    selector_join: boolean;
    pipeline: string | null;
    output_type: ExtractorOutputType;
    is_optional: boolean;
};
