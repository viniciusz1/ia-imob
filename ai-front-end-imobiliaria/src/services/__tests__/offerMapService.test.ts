import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "@/services/api";
import { getOfferMap } from "@/services/offerMapService";
import type { OfferMapResponse } from "@/types/offerMap";

vi.mock("@/services/api", () => ({
  default: { get: vi.fn() },
  API_PREFIX: "/api/v1",
}));

const response: OfferMapResponse = {
  city: "Jaraguá do Sul",
  total_count: 0,
  neighborhoods: [],
  unmapped_listings: [],
  price_ranges: [],
  data_date: null,
  sources: [],
  coverage: { mapped_count: 0, total_count: 0, percent: 0 },
  confidence: { level: "insufficient_sample", minimum_sample_size: 10 },
  geometry: {
    available: false,
    version: null,
    source: null,
    features: [],
  },
  filters: {},
};

describe("offerMapService", () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset();
  });

  it("unwraps the Laravel resource envelope", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: response } });

    await expect(
      getOfferMap({ city: "Jaraguá do Sul" }),
    ).resolves.toEqual(response);
  });
});
