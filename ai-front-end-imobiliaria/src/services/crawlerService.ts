import api, { API_PREFIX } from "./api";
import type {
  CrawlAgency,
  CrawlAgencyInput,
  CrawlAgencyLifecycle,
  MarketDataContract,
  MarketDataField,
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
