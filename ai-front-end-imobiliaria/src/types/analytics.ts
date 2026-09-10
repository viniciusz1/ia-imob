export interface MarketAnalyticsMeta {
  generated_at: string;
  data_reference_date: string | null;
}

export interface MarketAnalyticsResponse<TData> {
  data: TData;
  meta: MarketAnalyticsMeta;
}

export interface IndicatorItem {
  key?: string;
  label: string;
  count: number;
  share: number;
}

export interface IndicatorBlock {
  indicator: string;
  items: IndicatorItem[];
}

export interface FieldCompletenessItem {
  field: string;
  filled: number;
  share: number;
}

export interface MarketOverview {
  total_supply: { indicator: string; value: number };
  by_city: IndicatorBlock;
  by_neighbourhood: IndicatorBlock;
  by_type: IndicatorBlock;
  by_price_range: IndicatorBlock;
  by_area_range: IndicatorBlock;
  by_bedrooms: IndicatorBlock;
  by_parking_spaces: IndicatorBlock;
  by_agency: IndicatorBlock;
  field_completeness: { indicator: string; items: FieldCompletenessItem[] };
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

export interface CentralRangeIndicator extends SampleContext {
  indicator: string;
  p25: number | null;
  p75: number | null;
}

export interface PriceByGroupItem extends SampleContext {
  label: string;
  median: number | null;
  median_per_square_metre: number | null;
}

export interface DispersionItem {
  label: string;
  variation: number | null;
  sample_size: number;
  insufficient_sample: boolean;
}

export interface MarketPricing {
  median_price: PriceIndicator;
  average_price: PriceIndicator;
  central_price_range: CentralRangeIndicator;
  median_price_per_square_metre: PriceIndicator;
  by_type: { indicator: string; items: PriceByGroupItem[] };
  by_bedrooms: { indicator: string; items: PriceByGroupItem[] };
  dispersion_by_neighbourhood: { indicator: string; items: DispersionItem[] };
}

export interface NeighbourhoodRankingItem {
  label: string;
  median: number | null;
  sample_size: number;
}

export interface RankedListing {
  id: number;
  type: string;
  price: number | null;
  area: number | null;
  price_per_square_metre: number | null;
  neighbourhood: string | null;
  city: string | null;
  agency: string | null;
  listing_url: string | null;
}

export interface MarketRankings {
  neighbourhoods_by_price: { indicator: string; items: NeighbourhoodRankingItem[] };
  neighbourhoods_by_square_metre: { indicator: string; items: NeighbourhoodRankingItem[] };
  neighbourhood_extremes: {
    indicator: string;
    most_expensive: NeighbourhoodRankingItem | null;
    cheapest: NeighbourhoodRankingItem | null;
  };
  most_expensive_listings: { indicator: string; items: RankedListing[] };
  highest_price_per_square_metre_listings: { indicator: string; items: RankedListing[] };
  cheapest_listings: { indicator: string; items: RankedListing[] };
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
