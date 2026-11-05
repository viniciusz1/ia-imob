import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuctionDashboardClient } from "../AuctionDashboardClient";
import { getAuctionAnalytics } from "@/services/marketAnalyticsService";
import { getMarketPropertyFilters } from "@/services/marketPropertyService";
import type { AuctionAnalytics, AuctionOpportunity } from "@/types/analytics";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/analitico/leiloes",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/marketAnalyticsService", () => ({
  getAuctionAnalytics: vi.fn(),
}));

vi.mock("@/services/marketPropertyService", () => ({
  getMarketPropertyFilters: vi.fn(),
}));

const opportunity: AuctionOpportunity = {
  id: 1,
  title: "Casa de alvenaria 180m²",
  type: "Casa",
  city: "Jaraguá do Sul",
  neighbourhood: "Centro",
  modality: "Judicial",
  status: "scheduled",
  starts_at: "2026-11-20T14:00:00-03:00",
  area: 180,
  minimum_bid: 270000,
  appraisal_value: 450000,
  discount: 0.4,
  market_estimate: 900000,
  market_gap: 0.7,
  url: "https://leiloeiro.example/lote/1",
};

const analytics: AuctionAnalytics = {
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
  by_modality: {
    indicator: "A4.11",
    items: [
      {
        label: "Judicial",
        count: 9,
        below_market: 5,
        median_minimum_bid: 270000,
        median_discount: 0.4,
      },
    ],
  },
  by_type: { indicator: "A4.12", items: [] },
  by_neighbourhood: { indicator: "A4.13", items: [] },
  opportunities: { indicator: "A4.14", items: [opportunity] },
};

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <AuctionDashboardClient />
    </QueryClientProvider>,
  );
}

describe("AuctionDashboardClient", () => {
  beforeEach(() => {
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

    vi.mocked(getAuctionAnalytics).mockReset();
    vi.mocked(getAuctionAnalytics).mockResolvedValue({
      meta: {
        generated_at: "2026-11-05T12:00:00-03:00",
        data_reference_date: "2026-11-04T10:00:00-03:00",
      },
      data: analytics,
    });
  });

  it("shows the auction indicators", async () => {
    renderDashboard();

    expect(await screen.findByText("Lotes em leilão")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("6 (75%)")).toBeInTheDocument();
    // O desconto mediano aparece no indicador e também no recorte por modalidade.
    expect(screen.getAllByText("40%").length).toBeGreaterThan(0);
  });

  it("lists the opportunities with the market comparison", async () => {
    renderDashboard();

    expect(await screen.findByText("Casa de alvenaria 180m²")).toBeInTheDocument();
    expect(screen.getByText("Casa · Centro · Jaraguá do Sul")).toBeInTheDocument();
    expect(screen.getByText("R$ 900.000")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Casa de alvenaria/ })).toHaveAttribute(
      "href",
      "https://leiloeiro.example/lote/1",
    );
  });

  it("explains an inventory without opportunities", async () => {
    vi.mocked(getAuctionAnalytics).mockResolvedValue({
      meta: { generated_at: "2026-11-05T12:00:00-03:00", data_reference_date: null },
      data: { ...analytics, opportunities: { indicator: "A4.14", items: [] } },
    });

    renderDashboard();

    expect(await screen.findByText("Sem oportunidades no filtro")).toBeInTheDocument();
  });
});
