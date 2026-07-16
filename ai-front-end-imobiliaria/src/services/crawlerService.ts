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
  WorkerInstance,
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
