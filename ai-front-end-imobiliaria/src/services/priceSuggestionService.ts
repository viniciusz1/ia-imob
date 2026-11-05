import api, { API_PREFIX } from "@/services/api";
import type { SampleSummary, ValuationInput, ValuationPurpose, ValuationStatus } from "@/types/valuation";

export interface PriceSuggestion {
  status: ValuationStatus;
  purpose: ValuationPurpose;
  range: { min: number; central: number; max: number } | null;
  flood_adjustment_percent: number | null;
  sample_summary: SampleSummary;
}

export async function suggestMarketPrice(input: ValuationInput): Promise<PriceSuggestion> {
  const { data } = await api.post<{ data: PriceSuggestion }>(
    `${API_PREFIX}/valuations/price-suggestion`, input,
  );
  return data.data;
}
