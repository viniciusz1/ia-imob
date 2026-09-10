export interface MarketAnalyticsMeta {
  generated_at: string;
  data_reference_date: string | null;
}

export interface MarketAnalyticsResponse<TData> {
  data: TData;
  meta: MarketAnalyticsMeta;
}

export interface MarketOverview {
  total_supply: { indicator: string; value: number };
}

export interface SampleContext {
  sample_size: number;
  insufficient_sample: boolean;
  outliers_discarded: number;
}

export interface PriceIndicator extends SampleContext {
  indicator: string;
  value: number | null;
}

export interface PriceByGroupItem extends SampleContext {
  label: string;
  median: number | null;
  median_per_square_metre: number | null;
}

export interface MarketPricing {
  median_price: PriceIndicator;
  average_price: PriceIndicator;
  median_price_per_square_metre: PriceIndicator;
  by_type: { indicator: string; items: PriceByGroupItem[] };
  by_bedrooms: { indicator: string; items: PriceByGroupItem[] };
}

export interface NeighbourhoodRankingItem {
  label: string;
  median: number | null;
  sample_size: number;
}

export interface MarketRankings {
  neighbourhoods_by_price: { indicator: string; items: NeighbourhoodRankingItem[] };
  neighbourhoods_by_square_metre: { indicator: string; items: NeighbourhoodRankingItem[] };
}

export interface MarketAnalyticsFilters {
  cidade: string;
  bairro: string[];
  tipo: string[];
  imobiliaria: string[];
  quartos: number[];
  vagas: number[];
  min: string;
  max: string;
  area_min: string;
  area_max: string;
  data_inicio: string;
  data_fim: string;
}
