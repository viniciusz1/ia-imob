export type OfferMapLayer =
  | "stock"
  | "type"
  | "price"
  | "profile"
  | "concentration";

export interface OfferMapFilters {
  city: string;
  tipo?: string[];
  quartos?: number[];
  vagas?: number[];
  min_price?: number;
  max_price?: number;
  min_area?: number;
  max_area?: number;
}

export interface PriceRange {
  label: string;
  min: number | null;
  max: number | null;
}

export interface Concentration {
  type: string;
  level: "above" | "below" | "neutral" | "insufficient_sample";
  ratio: number | null;
}

export interface NeighborhoodListing {
  id: number;
  tipo: string;
  imobiliaria: string | null;
  valor: number | null;
  bairro: string;
  cidade: string;
  quartos: number | null;
  vagas: number | null;
  area: number | null;
  link: string | null;
  imagem: string | null;
}

export interface NeighborhoodMetric {
  name: string;
  original_name: string;
  count: number;
  city_share_percent: number;
  predominant_type: string | null;
  predominant_price_range: string | null;
  median_price: number | null;
  p25_price: number | null;
  p75_price: number | null;
  typical_bedrooms: number | string | null;
  typical_garage_spaces: number | string | null;
  typical_area: number | null;
  concentration: Concentration | null;
  sample_size: number;
  listings: NeighborhoodListing[];
}

export interface OfferMapResponse {
  city: string;
  total_count: number;
  neighborhoods: NeighborhoodMetric[];
  unmapped_listings: NeighborhoodListing[];
  price_ranges: PriceRange[];
  data_date: string | null;
  sources: string[];
  filters: Record<string, unknown>;
}
