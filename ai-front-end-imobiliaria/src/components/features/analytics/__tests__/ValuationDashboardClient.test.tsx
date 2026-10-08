import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValuationDashboardClient } from "../ValuationDashboardClient";
import { getValuationAnalytics } from "@/services/marketAnalyticsService";

vi.mock("@/services/marketAnalyticsService", () => ({
  getValuationAnalytics: vi.fn(),
}));

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <ValuationDashboardClient />
    </QueryClientProvider>,
  );
}

describe("ValuationDashboardClient", () => {
  beforeEach(() => {
    vi.mocked(getValuationAnalytics).mockReset();
    vi.mocked(getValuationAnalytics).mockResolvedValue({
      meta: {
        generated_at: "2026-09-24T12:00:00-03:00",
        data_reference_date: "2026-09-20T10:00:00-03:00",
      },
      data: {
        total: { indicator: "A3.01", value: 40 },
        calculated: { indicator: "A3.02", value: 30 },
        insufficient_sample: { indicator: "A3.03", value: 10 },
        calculated_share: { indicator: "A3.04", value: 0.75 },
        median_value: { indicator: "A3.05", value: 450000 },
        average_value: { indicator: "A3.06", value: 480000 },
        median_price_per_square_metre: { indicator: "A3.07", value: 4200 },
        by_type: {
          indicator: "A3.08",
          items: [{ label: "Casa", count: 25, median_value: 500000 }],
        },
        by_neighbourhood: { indicator: "A3.09", items: [] },
        by_month: { indicator: "A3.10", items: [{ label: "2026-09", count: 12 }] },
        by_user: { indicator: "A3.11", items: [] },
      },
    });
  });

  it("shows the valuation indicators", async () => {
    renderDashboard();

    expect(await screen.findByText("Avaliações realizadas")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("30 (75%)")).toBeInTheDocument();
    expect(screen.getByText("Casa")).toBeInTheDocument();
  });

  it("refetches with the selected period", async () => {
    renderDashboard();
    await screen.findByText("Avaliações realizadas");

    fireEvent.change(screen.getByLabelText("Data inicial das avaliações"), {
      target: { value: "2026-09-01" },
    });

    await waitFor(() =>
      expect(getValuationAnalytics).toHaveBeenLastCalledWith({
        data_inicio: "2026-09-01",
        data_fim: "",
      }),
    );
  });
});
