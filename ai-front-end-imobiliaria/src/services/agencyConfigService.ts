import api, { API_PREFIX } from "./api";
import type {
    AgencyConfig,
    AgencyConfigsResponse,
    AgencyFieldExtractor,
    AgencyFieldExtractorPayload,
    AgencyPayload,
    AgencyType,
    SitemapAgencyConfig,
    WsmAgencyConfig,
} from "@/types/agencyConfig";
import type { AgencyExtractorRefinement } from "@/types/agencyRefinement";

const BASE_PATH = `${API_PREFIX}/agency-configs`;

type ListResponse = { data: AgencyConfigsResponse };
type AgencyResponse = { data: AgencyConfig };
type ExtractorResponse = { data: AgencyFieldExtractor };
type RefinementResponse = { data: AgencyExtractorRefinement };

export async function getAgencyConfigs(): Promise<AgencyConfigsResponse> {
    const { data } = await api.get<ListResponse>(BASE_PATH);
    return data.data;
}

export async function createAgencyConfig(
    agencyType: AgencyType,
    payload: AgencyPayload
): Promise<SitemapAgencyConfig | WsmAgencyConfig> {
    const { data } = await api.post<AgencyResponse>(`${BASE_PATH}/${agencyType}`, payload);
    return data.data as SitemapAgencyConfig | WsmAgencyConfig;
}

export async function updateAgencyConfig(
    agencyType: AgencyType,
    agencyId: number,
    payload: AgencyPayload
): Promise<SitemapAgencyConfig | WsmAgencyConfig> {
    const { data } = await api.put<AgencyResponse>(`${BASE_PATH}/${agencyType}/${agencyId}`, payload);
    return data.data as SitemapAgencyConfig | WsmAgencyConfig;
}

export async function deleteAgencyConfig(agencyType: AgencyType, agencyId: number): Promise<void> {
    await api.delete(`${BASE_PATH}/${agencyType}/${agencyId}`);
}

export async function getAgencyExtractorRefinement(
    agencyType: AgencyType,
    agencyId: number
): Promise<AgencyExtractorRefinement> {
    const { data } = await api.get<RefinementResponse>(
        `${BASE_PATH}/${agencyType}/${agencyId}/refinement`
    );
    return data.data;
}

export async function createAgencyExtractor(
    agencyType: AgencyType,
    agencyId: number,
    payload: AgencyFieldExtractorPayload
): Promise<AgencyFieldExtractor> {
    const { data } = await api.post<ExtractorResponse>(
        `${BASE_PATH}/${agencyType}/${agencyId}/extractors`,
        payload
    );
    return data.data;
}

export async function updateAgencyExtractor(
    extractorId: number,
    payload: AgencyFieldExtractorPayload
): Promise<AgencyFieldExtractor> {
    const { data } = await api.put<ExtractorResponse>(
        `${BASE_PATH}/extractors/${extractorId}`,
        payload
    );
    return data.data;
}

export async function deleteAgencyExtractor(extractorId: number): Promise<void> {
    await api.delete(`${BASE_PATH}/extractors/${extractorId}`);
}
