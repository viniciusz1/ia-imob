import api, { API_PREFIX } from "@/services/api";
import type { OfferMapFilters, OfferMapResponse } from "@/types/offerMap";

export async function getOfferMap(
  filters: OfferMapFilters,
  layer = "stock",
  concentrationType?: string,
): Promise<OfferMapResponse> {
  const params = new URLSearchParams();

  params.set("city", filters.city);
  params.set("layer", layer);

  if (concentrationType) {
    params.set("concentration_type", concentrationType);
  }

  filters.tipo?.forEach((tipo) => params.append("tipo[]", tipo));
  filters.quartos?.forEach((quartos) => params.append("quartos[]", String(quartos)));
  filters.vagas?.forEach((vagas) => params.append("vagas[]", String(vagas)));

  if (filters.min_price !== undefined) {
    params.set("min_price", String(filters.min_price));
  }

  if (filters.max_price !== undefined) {
    params.set("max_price", String(filters.max_price));
  }

  if (filters.min_area !== undefined) {
    params.set("min_area", String(filters.min_area));
  }

  if (filters.max_area !== undefined) {
    params.set("max_area", String(filters.max_area));
  }

  const { data } = await api.get<{ data: OfferMapResponse }>(
    `${API_PREFIX}/market-insights/offer-map?${params.toString()}`,
  );

  return data.data;
}
