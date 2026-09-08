import api, { API_PREFIX } from "./api";
import type {
  MarketAnalyticsFilters,
  MarketAnalyticsResponse,
  MarketOverview,
  MarketPricing,
  MarketRankings,
} from "@/types/analytics";

const BASE_PATH = `${API_PREFIX}/analytics/market`;

export function toQueryParams(filters: Partial<MarketAnalyticsFilters>): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.cidade) params.set("cidade", filters.cidade);
  if (filters.min) params.set("min", filters.min);
  if (filters.max) params.set("max", filters.max);
  if (filters.area_min) params.set("area_min", filters.area_min);
  if (filters.area_max) params.set("area_max", filters.area_max);
  if (filters.data_inicio) params.set("data_inicio", filters.data_inicio);
  if (filters.data_fim) params.set("data_fim", filters.data_fim);

  filters.bairro?.forEach((value) => params.append("bairro[]", value));
  filters.tipo?.forEach((value) => params.append("tipo[]", value));
  filters.imobiliaria?.forEach((value) => params.append("imobiliaria[]", value));
  filters.quartos?.forEach((value) => params.append("quartos[]", String(value)));
  filters.vagas?.forEach((value) => params.append("vagas[]", String(value)));

  return params;
}

async function get<TData>(
  resource: string,
  filters: Partial<MarketAnalyticsFilters>,
  extra?: Record<string, string>,
): Promise<MarketAnalyticsResponse<TData>> {
  const params = toQueryParams(filters);

  Object.entries(extra ?? {}).forEach(([key, value]) => params.set(key, value));

  const query = params.toString();
  const { data } = await api.get<MarketAnalyticsResponse<TData>>(
    `${BASE_PATH}/${resource}${query ? `?${query}` : ""}`,
  );

  return data;
}

export function getMarketOverview(filters: Partial<MarketAnalyticsFilters>) {
  return get<MarketOverview>("overview", filters);
}

export function getMarketPricing(filters: Partial<MarketAnalyticsFilters>) {
  return get<MarketPricing>("pricing", filters);
}

export function getMarketRankings(filters: Partial<MarketAnalyticsFilters>, limit = 10) {
  return get<MarketRankings>("rankings", filters, { limite: String(limit) });
}
