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
  comodidades?: string[];
}

export interface MarketPropertyFiltersQuery {
  tipo?: string[];
  bairro?: string[];
  cidade?: string[];
  imobiliaria?: string[];
  quartos?: number[];
  quartos_plus?: boolean;
  suites?: number[];
  suites_plus?: boolean;
  banheiros?: number[];
  banheiros_plus?: boolean;
  vagas?: number[];
  vagas_plus?: boolean;
  comodidade?: string[];
  min?: string;
  max?: string;
  area_min?: string;
  area_max?: string;
  data_inicio?: string;
  data_fim?: string;
  descricao?: string;
}

function serializeFiltersQuery(query?: MarketPropertyFiltersQuery): string {
  if (!query) return "";

  const params = new URLSearchParams();

  const arrayKeys = [
    "tipo",
    "bairro",
    "cidade",
    "imobiliaria",
    "quartos",
    "suites",
    "banheiros",
    "vagas",
    "comodidade",
  ] as const;

  for (const key of arrayKeys) {
    const values = query[key];
    if (Array.isArray(values)) {
      for (const value of values) {
        if (value !== "" && value !== null && value !== undefined) {
          params.append(`${key}[]`, String(value));
        }
      }
    }
  }

  const boolKeys = [
    "quartos_plus",
    "suites_plus",
    "banheiros_plus",
    "vagas_plus",
  ] as const;

  for (const key of boolKeys) {
    if (query[key]) {
      params.set(key, "1");
    }
  }

  const scalarKeys = [
    "min",
    "max",
    "area_min",
    "area_max",
    "data_inicio",
    "data_fim",
    "descricao",
  ] as const;

  for (const key of scalarKeys) {
    const value = query[key];
    if (value) {
      params.set(key, value);
    }
  }

  return params.toString();
}

export async function getMarketPropertyFilters(
  query?: MarketPropertyFiltersQuery
): Promise<MarketPropertyFiltersResponse> {
  const queryString = serializeFiltersQuery(query);
  const url = queryString
    ? `${API_PREFIX}/market-properties/filters?${queryString}`
    : `${API_PREFIX}/market-properties/filters`;
  const { data } = await api.get<MarketPropertyFiltersResponse>(url);
  return data;
}
