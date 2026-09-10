import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarketDashboardClient } from "../MarketDashboardClient";
import {
  getMarketOverview,
  getMarketPricing,
  getMarketRankings,
} from "@/services/marketAnalyticsService";
import { getMarketPropertyFilters } from "@/services/marketPropertyService";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/analitico/mercado",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/marketAnalyticsService", () => ({
  getMarketOverview: vi.fn(),
  getMarketPricing: vi.fn(),
  getMarketRankings: vi.fn(),
}));

vi.mock("@/services/marketPropertyService", () => ({
  getMarketPropertyFilters: vi.fn(),
}));

const meta = {
  generated_at: "2026-09-08T12:00:00-03:00",
  data_reference_date: "2026-08-01T19:32:00-03:00",
};

const emptyBlock = { indicator: "", items: [] };

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MarketDashboardClient />
    </QueryClientProvider>,
  );
}

function mockServices() {
  vi.mocked(getMarketPropertyFilters).mockResolvedValue({
      tipos: [],
      bairros: [],
      bairros_por_cidade: {},
      cidades: [],
      imobiliarias: [],
      quartos: [],
      suites: [],
      banheiros: [],
      vagas: [],
    });

  vi.mocked(getMarketOverview).mockResolvedValue({
      meta,
      data: {
        total_supply: { indicator: "A1.01", value: 4083 },
        by_city: emptyBlock,
        by_neighbourhood: emptyBlock,
        by_type: emptyBlock,
        by_price_range: emptyBlock,
        by_area_range: emptyBlock,
        by_bedrooms: emptyBlock,
        by_parking_spaces: emptyBlock,
        by_agency: {
          indicator: "A1.09",
          items: [
            { label: "ITAIVAN", count: 894, share: 0.22 },
            { label: "Chalé", count: 749, share: 0.18 },
          ],
        },
        field_completeness: { indicator: "A1.10", items: [] },
      },
    });

  const sample = { sample_size: 3767, insufficient_sample: false, outliers_discarded: 316 };

  vi.mocked(getMarketPricing).mockResolvedValue({
      meta,
      data: {
        median_price: { indicator: "A2.01", value: 490000, ...sample },
        average_price: { indicator: "A2.02", value: 624442.5, ...sample },
        central_price_range: { indicator: "A2.03", p25: 230000, p75: 897000, ...sample },
        median_price_per_square_metre: {
          indicator: "A2.04",
          value: 4052.8,
          sample_size: 916,
          insufficient_sample: false,
          outliers_discarded: 23,
        },
        by_type: { indicator: "A2.11", items: [] },
        by_bedrooms: { indicator: "A2.12", items: [] },
        dispersion_by_neighbourhood: { indicator: "A2.13", items: [] },
      },
    });

  vi.mocked(getMarketRankings).mockResolvedValue({
    meta,
    data: {
      neighbourhoods_by_price: { indicator: "A2.05", items: [] },
      neighbourhoods_by_square_metre: { indicator: "A2.06", items: [] },
      neighbourhood_extremes: { indicator: "A2.07", most_expensive: null, cheapest: null },
      most_expensive_listings: { indicator: "A2.08", items: [] },
      highest_price_per_square_metre_listings: { indicator: "A2.09", items: [] },
      cheapest_listings: { indicator: "A2.10", items: [] },
    },
  });
}

describe("MarketDashboardClient", () => {
  beforeEach(() => mockServices());

  it("leads with the supply figure and the headline prices", async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByText("4.083")).toBeInTheDocument());

    expect(screen.getByText("R$ 490.000")).toBeInTheDocument();
    expect(screen.getByText("R$ 624.443")).toBeInTheDocument();
    expect(screen.getByText("R$ 4.053/m²")).toBeInTheDocument();
  });

  it("keeps each KPI card down to a label and a figure", async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByText("4.083")).toBeInTheDocument());

    for (const context of [
      "2 imobiliárias no recorte",
      "Metade central entre R$ 230.000 e R$ 897.000",
      "316 valores fora do padrão descartados",
      "916 de 4.083 imóveis têm área informada",
    ]) {
      expect(screen.queryByText(context)).not.toBeInTheDocument();
    }
  });

  it("groups the indicators into a handful of panels instead of one card each", async () => {
    renderDashboard();

    await waitFor(() => expect(screen.getByText("4.083")).toBeInTheDocument());

    for (const panel of [
      "Onde está a oferta",
      "Perfil dos imóveis",
      "Preço por recorte",
      "Bairros mais caros",
      "Imóveis em destaque",
    ]) {
      expect(screen.getByText(panel)).toBeInTheDocument();
    }

    expect(screen.queryByText("A1.01")).not.toBeInTheDocument();
    expect(screen.queryByText("A2.01")).not.toBeInTheDocument();
    expect(screen.queryByText("A1.02")).not.toBeInTheDocument();
  });
});
