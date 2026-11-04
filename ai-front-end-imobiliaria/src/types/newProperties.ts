// Tipos do contrato de GET /api/v1/new-properties.
// Referência completa em docs/contexts/new-properties/API.md.

/** Filtro de classificação: todos, só Novos, só Oportunidades ou as duas flags. */
export type NewPropertyFlagFilter = "all" | "new" | "opportunity" | "both";

/** Motivo da decisão sobre a flag Novo. */
export type NewPropertyReason =
  | "absent_in_30_day_window"
  | "observed_in_window"
  | "insufficient_history";

/** Motivo da decisão sobre a flag Oportunidade. */
export type OpportunityReason =
  | "price_below_comparable_median"
  | "at_or_above_comparable_median"
  | "below_opportunity_threshold"
  | "insufficient_comparables"
  | "missing_price_or_area"
  | "invalid_comparable_segment";

/** Tamanho da amostra: baixa (5 a 7), média (8 a 14) ou alta (15 ou mais comparáveis). */
export type SampleSizeIndicator = "low" | "medium" | "high";

/** Anúncio classificado, com suas flags e os dados que explicam cada decisão. */
export interface NewPropertyItem {
  id: number;
  image: string;
  title: string | null;
  purpose: string | null;
  tipo: string;
  preco: number;
  bairro: string;
  cidade: string;
  imobiliaria: string;
  quartos: number;
  suites: number;
  banheiros: number;
  vagas: number;
  area: number;
  descricao: string;
  link_imovel: string;
  is_new: boolean;
  new_reason: NewPropertyReason;
  history_window_start: string;
  history_snapshot_count: number;
  identified_at: string;
  first_seen_in_current_window_at: string | null;
  is_opportunity: boolean;
  opportunity_score: number | null;
  opportunity_reason: OpportunityReason;
  opportunity_explanation: string;
  price_per_square_meter: number | null;
  benchmark_price_per_square_meter: number | null;
  price_advantage_percentage: number | null;
  comparable_count: number;
  sample_size_indicator: SampleSizeIndicator | null;
}

/** Grupo de anúncios de uma Imobiliária de Origem; counts vale para o snapshot inteiro. */
export interface NewPropertyAgencyGroup {
  crawl_agency: {
    id: number;
    name: string;
  };
  snapshot: {
    id: number;
    published_at: string;
  };
  counts: {
    total: number;
    new: number;
    opportunities: number;
  };
  history: {
    status: "sufficient" | "insufficient";
    window_days: number;
    window_start: string;
    window_end: string;
    snapshot_count: number;
    snapshot_ids: number[];
    observed_identity_count: number;
    identity_strategy: "listing_identity";
  };
  properties: NewPropertyItem[];
}

/** Resposta da API; os totais e as opções de filtro valem para todo o inventário. */
export interface NewPropertiesResponse {
  data: NewPropertyAgencyGroup[];
  meta: {
    updated_at: string | null;
    total: number;
    total_new: number;
    total_opportunities: number;
    filtered_total: number;
    filters: {
      agencies: { id: number; name: string }[];
      cities: string[];
      neighborhoods: string[];
      types: string[];
      purposes: string[];
    };
    pagination: {
      page: number;
      per_page: number;
      total: number;
      last_page: number;
      has_more: boolean;
    };
  };
}

/** Parâmetros aceitos pela API. Todos são opcionais. */
export interface NewPropertiesParams {
  agency_id?: number;
  city?: string;
  neighborhood?: string;
  type?: string;
  purpose?: string;
  flag?: NewPropertyFlagFilter;
  search?: string;
  bedrooms?: string;
  bathrooms?: string;
  parking?: string;
  sort?: "identified_desc" | "identified_asc" | "opportunity_desc";
  page?: number;
  per_page?: number;
}
