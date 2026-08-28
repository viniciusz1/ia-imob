export type NewPropertyFlagFilter = "all" | "new" | "opportunity" | "both";

export type NewPropertyReason =
  | "absent_in_30_day_window"
  | "observed_in_window"
  | "insufficient_history";

export type OpportunityReason =
  | "price_below_comparable_median"
  | "at_or_above_comparable_median"
  | "below_opportunity_threshold"
  | "insufficient_comparables"
  | "missing_price_or_area"
  | "invalid_comparable_segment";

export type SampleSizeIndicator = "low" | "medium" | "high";

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
    snapshot_count: number;
    window_start: string;
  };
  properties: NewPropertyItem[];
}

export interface NewPropertiesResponse {
  data: NewPropertyAgencyGroup[];
  meta: {
    updated_at: string | null;
    total: number;
    total_new: number;
    total_opportunities: number;
  };
}
