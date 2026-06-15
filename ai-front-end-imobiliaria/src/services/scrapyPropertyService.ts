import api, { API_PREFIX } from "./api";

export interface ScrapyPropertyFiltersResponse {
  tipos: string[];
  bairros: string[];
  cidades: string[];
  imobiliarias: string[];
  quartos: number[];
  suites: number[];
  banheiros: number[];
  vagas: number[];
}

export async function getScrapyPropertyFilters(): Promise<ScrapyPropertyFiltersResponse> {
  const { data } = await api.get<ScrapyPropertyFiltersResponse>(`${API_PREFIX}/scrapy-properties/filters`);
  return data;
}
