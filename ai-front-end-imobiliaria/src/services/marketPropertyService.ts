import api, { API_PREFIX } from "./api";

export interface MarketPropertyFiltersResponse {
  tipos: string[];
  bairros: string[];
  bairros_por_cidade: Record<string, string[]>;
  cidades: string[];
  imobiliarias: string[];
  quartos: number[];
  suites: number[];
  banheiros: number[];
  vagas: number[];
}

export async function getMarketPropertyFilters(): Promise<MarketPropertyFiltersResponse> {
  const { data } = await api.get<MarketPropertyFiltersResponse>(`${API_PREFIX}/market-properties/filters`);
  return data;
}
