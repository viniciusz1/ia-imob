import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalyticsOverviewClient } from "../AnalyticsOverviewClient";
import {
  getAuctionAnalytics,
  getMarketOverview,
  getMarketPricing,
  getValuationAnalytics,
} from "@/services/marketAnalyticsService";
import { getMarketPropertyFilters } from "@/services/marketPropertyService";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/analitico",
  useSearchParams: () => new URLSearchParams("cidade=Jaragu%C3%A1+do+Sul"),
}));

vi.mock("@/services/marketAnalyticsService", () => ({
  getAuctionAnalytics: vi.fn(),
  getMarketOverview: vi.fn(),
  getMarketPricing: vi.fn(),
  getValuationAnalytics: vi.fn(),
}));

vi.mock("@/services/marketPropertyService", () => ({
  getMarketPropertyFilters: vi.fn(),
}));

const meta = {
  generated_at: "2026-11-05T12:00:00-03:00",
  data_reference_date: "2026-11-04T10:00:00-03:00",
};

const sample = { sample_size: 40, insufficient_sample: false, outliers_discarded: 0 };

function renderOverview() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <AnalyticsOverviewClient />
    </QueryClientProvider>,
  );
}

describe("AnalyticsOverviewClient", () => {
  beforeEach(() => {
    vi.mocked(getMarketPropertyFilters).mockResolvedValue({
      tipos: [],
      bairros: [],
      bairros_por_cidade: {},
      cidades: ["Jaraguá do Sul"],
      imobiliarias: [],
      quartos: [],
      suites: [],
      banheiros: [],
      vagas: [],
    });

    vi.mocked(getMarketOverview).mockResolvedValue({
      meta,
      data: { total_supply: { indicator: "A1.01", value: 4083 } },
    });

    vi.mocked(getMarketPricing).mockResolvedValue({
      meta,
      data: {
        median_price: { indicator: "A2.01", value: 650000, ...sample },
        average_price: { indicator: "A2.02", value: 700000, ...sample },
        median_price_per_square_metre: { indicator: "A2.03", value: 7200, ...sample },
        by_type: { indicator: "A2.04", items: [] },
        by_bedrooms: { indicator: "A2.05", items: [] },
      },
    });

    vi.mocked(getAuctionAnalytics).mockResolvedValue({
      meta,
      data: {
        total_lots: { indicator: "A4.01", value: 12 },
        with_appraisal: { indicator: "A4.02", value: 10 },
        median_minimum_bid: { indicator: "A4.03", value: 270000 },
        median_appraisal: { indicator: "A4.04", value: 450000 },
        median_discount: { indicator: "A4.05", value: 0.4 },
        median_minimum_bid_per_square_metre: { indicator: "A4.06", value: 1500 },
        compared_to_market: { indicator: "A4.07", value: 8 },
        below_market: { indicator: "A4.08", value: 6 },
        below_market_share: { indicator: "A4.09", value: 0.75 },
        median_market_gap: { indicator: "A4.10", value: 0.55 },
        by_modality: { indicator: "A4.11", items: [] },
        by_type: { indicator: "A4.12", items: [] },
        by_neighbourhood: { indicator: "A4.13", items: [] },
        opportunities: { indicator: "A4.14", items: [] },
      },
    });

    vi.mocked(getValuationAnalytics).mockResolvedValue({
      meta,
      data: {
        total: { indicator: "A3.01", value: 40 },
        calculated: { indicator: "A3.02", value: 30 },
        insufficient_sample: { indicator: "A3.03", value: 10 },
        calculated_share: { indicator: "A3.04", value: 0.75 },
        median_value: { indicator: "A3.05", value: 450000 },
        average_value: { indicator: "A3.06", value: 480000 },
        median_price_per_square_metre: { indicator: "A3.07", value: 4200 },
        by_type: { indicator: "A3.08", items: [] },
        by_neighbourhood: { indicator: "A3.09", items: [] },
        by_month: { indicator: "A3.10", items: [] },
        by_user: { indicator: "A3.11", items: [] },
      },
    });
  });

  it("summarises the three analyses under the same filter", async () => {
    renderOverview();

    expect(await screen.findByText("Imóveis em oferta")).toBeInTheDocument();
    expect(screen.getByText("4.083")).toBeInTheDocument();
    expect(await screen.findByText("Lotes em leilão")).toBeInTheDocument();
    expect(screen.getByText("6 (75%)")).toBeInTheDocument();
    expect(await screen.findByText("Avaliações realizadas")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("carries the current filter into each detail link", async () => {
    renderOverview();

    expect(await screen.findByRole("link", { name: "Ver análise de leilões" })).toHaveAttribute(
      "href",
      "/analitico/leiloes?cidade=Jaragu%C3%A1+do+Sul",
    );
    expect(screen.getByRole("link", { name: "Ver análise de mercado" })).toHaveAttribute(
      "href",
      "/analitico/mercado?cidade=Jaragu%C3%A1+do+Sul",
    );
  });

  it("requests every analysis with the filter taken from the URL", async () => {
    renderOverview();
    await screen.findByText("Imóveis em oferta");

    expect(getMarketOverview).toHaveBeenCalledWith(
      expect.objectContaining({ cidade: "Jaraguá do Sul" }),
    );
    expect(getAuctionAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({ cidade: "Jaraguá do Sul" }),
    );
  });
});
