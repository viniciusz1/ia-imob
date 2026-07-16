import api, { API_PREFIX } from "./api";
import type {
  CrawlAgency,
  CrawlAgencyInput,
  CrawlAgencyLifecycle,
  MarketDataContract,
  MarketDataField,
  CrawlerOperation,
  DiscoverySnapshotUrl,
  DiscoverySnapshot,
  ExtractionProfile,
  ProfileValidationReport,
  CrawlRun,
  PaginatedCrawlRunRecords,
  OperationGroup,
  WorkerInstance,
  QualityPolicy,
} from "@/types/crawler";

const BASE = `${API_PREFIX}/admin/crawler`;

interface Resource<T> {
  data: T;
}

export async function listMarketDataContracts(): Promise<MarketDataContract[]> {
  const response = await api.get<Resource<MarketDataContract[]>>(`${BASE}/market-data-contracts`);
  return response.data.data;
}

export async function createMarketDataContract(fields: MarketDataField[]): Promise<MarketDataContract> {
  const response = await api.post<Resource<MarketDataContract>>(`${BASE}/market-data-contracts`, { fields });
  return response.data.data;
}

export async function validateMarketDataContract(id: number): Promise<MarketDataContract> {
  const response = await api.post<Resource<MarketDataContract>>(`${BASE}/market-data-contracts/${id}/validate`);
  return response.data.data;
}

export async function activateMarketDataContract(id: number): Promise<MarketDataContract> {
  const response = await api.post<Resource<MarketDataContract>>(`${BASE}/market-data-contracts/${id}/activate`);
  return response.data.data;
}

export async function listCrawlerOperations(): Promise<CrawlerOperation[]> {
  const response = await api.get<Resource<CrawlerOperation[]>>(`${BASE}/operations`);
  return response.data.data;
}

export async function getCrawlerOperation(id: number): Promise<CrawlerOperation> {
  const response = await api.get<Resource<CrawlerOperation>>(`${BASE}/operations/${id}`);
  return response.data.data;
}

export async function queueDiscoveryOperation(
  crawlAgencyId: number,
  contractId: number,
): Promise<CrawlerOperation> {
  const response = await api.post<Resource<CrawlerOperation>>(`${BASE}/operations`, {
    type: "discovery",
    crawl_agency_id: crawlAgencyId,
    market_data_contract_version_id: contractId,
  });
  return response.data.data;
}

export async function listCrawlerWorkers(): Promise<WorkerInstance[]> {
  const response = await api.get<Resource<WorkerInstance[]>>(`${BASE}/workers`);
  return response.data.data;
}

export async function cancelCrawlerOperation(id: number): Promise<CrawlerOperation> {
  const response = await api.post<Resource<CrawlerOperation>>(`${BASE}/operations/${id}/cancel`);
  return response.data.data;
}

export async function retryCrawlerOperation(id: number): Promise<CrawlerOperation> {
  const response = await api.post<Resource<CrawlerOperation>>(`${BASE}/operations/${id}/retry`);
  return response.data.data;
}

export async function createOperationGroup(name: string, operationIds: number[]): Promise<OperationGroup> {
  const response = await api.post<Resource<OperationGroup>>(`${BASE}/operation-groups`, { name, operation_ids: operationIds });
  return response.data.data;
}

export async function actOnOperationGroup(
  groupId: number,
  action: "cancel" | "retry",
  operationIds: number[],
): Promise<OperationGroup> {
  const response = await api.post<Resource<OperationGroup>>(`${BASE}/operation-groups/${groupId}/actions`, {
    action,
    operation_ids: operationIds,
  });
  return response.data.data;
}

export async function listDiscoverySnapshotUrls(id: number): Promise<DiscoverySnapshotUrl[]> {
  const response = await api.get<Resource<DiscoverySnapshotUrl[]>>(`${BASE}/discovery-snapshots/${id}/urls`);
  return response.data.data;
}

export async function listDiscoverySnapshots(agencyId: number): Promise<DiscoverySnapshot[]> {
  const response = await api.get<Resource<DiscoverySnapshot[]>>(`${BASE}/crawl-agencies/${agencyId}/discovery-snapshots`);
  return response.data.data;
}

export async function listExtractionProfiles(agencyId: number): Promise<ExtractionProfile[]> {
  const response = await api.get<Resource<ExtractionProfile[]>>(`${BASE}/crawl-agencies/${agencyId}/extraction-profiles`);
  return response.data.data;
}

export async function queueSampleUrlSuggestion(agencyId: number): Promise<CrawlerOperation> {
  const response = await api.post<Resource<CrawlerOperation>>(`${BASE}/crawl-agencies/${agencyId}/sample-url-suggestion`);
  return response.data.data;
}

export async function queueExtractionProfileGeneration(payload: {
  crawl_agency_id: number;
  discovery_snapshot_id: number;
  market_data_contract_version_id: number;
  sample_url: string;
  sample_url_confirmed: true;
}): Promise<CrawlerOperation> {
  const response = await api.post<Resource<CrawlerOperation>>(`${BASE}/extraction-profiles/generate`, payload);
  return response.data.data;
}

export async function queueProfileValidation(profileId: number): Promise<CrawlerOperation> {
  const response = await api.post<Resource<CrawlerOperation>>(`${BASE}/extraction-profiles/${profileId}/validation`);
  return response.data.data;
}

export async function getProfileValidationReport(id: number): Promise<ProfileValidationReport> {
  const response = await api.get<Resource<ProfileValidationReport>>(`${BASE}/profile-validation-reports/${id}`);
  return response.data.data;
}

export async function decideExtractionProfile(
  profileId: number,
  decision: "approved" | "rejected",
  reason: string,
): Promise<ExtractionProfile> {
  const response = await api.post<Resource<ExtractionProfile>>(`${BASE}/extraction-profiles/${profileId}/decision`, {
    decision,
    reason,
  });
  return response.data.data;
}

export async function activateExtractionProfile(profileId: number): Promise<ExtractionProfile> {
  const response = await api.post<Resource<ExtractionProfile>>(`${BASE}/extraction-profiles/${profileId}/activate`);
  return response.data.data;
}

export async function activateCrawlAgency(id: number): Promise<CrawlAgency> {
  const response = await api.post<Resource<CrawlAgency>>(`${BASE}/crawl-agencies/${id}/activate`);
  return response.data.data;
}

export interface QueueProductionCrawlPayload {
  crawl_agency_id: number;
  discovery_mode: "fresh" | "existing";
  discovery_snapshot_id?: number;
  extraction_profile_id?: number;
}

export async function queueProductionCrawl(payload: QueueProductionCrawlPayload): Promise<CrawlerOperation> {
  const response = await api.post<Resource<CrawlerOperation>>(`${BASE}/production-crawls`, payload);
  return response.data.data;
}

export async function getCrawlRun(id: number): Promise<CrawlRun> {
  const response = await api.get<Resource<CrawlRun>>(`${BASE}/crawl-runs/${id}`);
  return response.data.data;
}

export async function listCrawlRuns(agencyId: number): Promise<CrawlRun[]> {
  const response = await api.get<Resource<CrawlRun[]>>(`${BASE}/crawl-agencies/${agencyId}/crawl-runs`);
  return response.data.data;
}

export async function listQualityPolicies(): Promise<QualityPolicy[]> {
  const response = await api.get<Resource<QualityPolicy[]>>(`${BASE}/quality-policies`);
  return response.data.data;
}

export async function createQualityPolicy(rules: QualityPolicy["rules"]): Promise<QualityPolicy> {
  const response = await api.post<Resource<QualityPolicy>>(`${BASE}/quality-policies`, { rules });
  return response.data.data;
}

export async function validateQualityPolicy(id: number): Promise<QualityPolicy> {
  const response = await api.post<Resource<QualityPolicy>>(`${BASE}/quality-policies/${id}/validate`);
  return response.data.data;
}

export async function activateQualityPolicy(id: number): Promise<QualityPolicy> {
  const response = await api.post<Resource<QualityPolicy>>(`${BASE}/quality-policies/${id}/activate`);
  return response.data.data;
}

export async function createQualityException(reportId: number, reason: string): Promise<void> {
  await api.post(`${BASE}/quality-reports/${reportId}/exceptions`, { reason });
}

export async function publishCrawlRunExceptionally(runId: number, reason: string): Promise<CrawlRun> {
  const response = await api.post<Resource<CrawlRun>>(`${BASE}/crawl-runs/${runId}/exceptional-publication`, { reason });
  return response.data.data;
}

export async function listCrawlRunRecords(
  runId: number,
  params: {
    view: "normalized" | "raw" | "rejected";
    search?: string;
    sort?: string;
    listing_state?: "new" | "changed" | "unchanged" | "missing" | "removed" | "reappeared";
    page?: number;
    per_page?: number;
  },
): Promise<PaginatedCrawlRunRecords> {
  const response = await api.get<PaginatedCrawlRunRecords>(`${BASE}/crawl-runs/${runId}/records`, { params });
  return response.data;
}

export async function listCrawlAgencies(): Promise<CrawlAgency[]> {
  const response = await api.get<Resource<CrawlAgency[]>>(`${BASE}/crawl-agencies`);
  return response.data.data;
}

export async function getCrawlAgency(id: number): Promise<CrawlAgency> {
  const response = await api.get<Resource<CrawlAgency>>(`${BASE}/crawl-agencies/${id}`);
  return response.data.data;
}

export async function createCrawlAgency(payload: CrawlAgencyInput): Promise<CrawlAgency> {
  const response = await api.post<Resource<CrawlAgency>>(`${BASE}/crawl-agencies`, payload);
  return response.data.data;
}

export async function updateCrawlAgency(id: number, payload: CrawlAgencyInput): Promise<CrawlAgency> {
  const response = await api.put<Resource<CrawlAgency>>(`${BASE}/crawl-agencies/${id}`, payload);
  return response.data.data;
}

export async function transitionCrawlAgency(
  id: number,
  lifecycleState: CrawlAgencyLifecycle,
): Promise<CrawlAgency> {
  const response = await api.patch<Resource<CrawlAgency>>(
    `${BASE}/crawl-agencies/${id}/lifecycle`,
    { lifecycle_state: lifecycleState },
  );
  return response.data.data;
}
