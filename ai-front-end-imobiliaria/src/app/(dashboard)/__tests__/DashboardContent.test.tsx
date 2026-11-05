import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderWithoutProviders, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardContent } from "../DashboardContent";
import { getAuctions } from "@/services/auctionService";
import { getValuations } from "@/services/valuationService";
import { useAuthStore } from "@/store/useAuthStore";

vi.mock("@/services/propertyService", () => ({
  getProperties: vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 1, total: 12 } }),
}));

vi.mock("@/services/newPropertiesService", () => ({
  getNewProperties: vi.fn().mockResolvedValue({
    data: [],
    meta: { total: 40, total_new: 30, total_opportunities: 5, filtered_total: 40 },
  }),
}));

vi.mock("@/services/auctionService", () => ({
  getAuctions: vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 1, total: 3 } }),
}));

vi.mock("@/services/valuationService", () => ({
  getValuations: vi.fn().mockResolvedValue({ data: [], meta: { current_page: 1, last_page: 1, per_page: 1, total: 7 } }),
}));

/** The home reads its totals through React Query. */
function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithoutProviders(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("DashboardContent", () => {
  it("renders cards for modules the user can access", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      is_platform_admin: false,
      permissions: ["properties.view", "users.view"],
    });

    render(<DashboardContent />);

    expect(screen.getByRole("link", { name: /^gerenciar imóveis$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /usuários/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^novos imóveis$/i })).toBeInTheDocument();
  });

  it("hides cards for modules the user cannot access", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Admin",
      email: "admin@example.com",
      is_platform_admin: false,
      permissions: ["properties.view"],
    });

    render(<DashboardContent />);

    expect(screen.getByRole("link", { name: /^gerenciar imóveis$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /usuários/i })).not.toBeInTheDocument();
  });

  it("keeps protected modules hidden while permissions are still loading", () => {
    useAuthStore.getState().clearAuth();

    render(<DashboardContent />);

    expect(screen.queryByRole("link", { name: /^gerenciar imóveis$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /usuários/i })).not.toBeInTheDocument();
  });

  it("shows only platform modules to a Crawler Operator", () => {
    useAuthStore.getState().setUser({
      id: 4,
      name: "Platform Admin",
      email: "platform@imobiliaria.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "platform.agencies.view"],
    });

    render(<DashboardContent />);

    expect(screen.getByRole("link", { name: /operações do crawler/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /gerenciar imóveis/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^usuários$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^grupos$/i })).not.toBeInTheDocument();
  });

  it("hides platform modules from an Agency Admin with stale permissions", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Agency Admin",
      email: "admin@example.com",
      is_platform_admin: false,
      permissions: ["crawler.view"],
    });

    render(<DashboardContent />);

    expect(screen.queryByRole("link", { name: /operações do crawler/i })).not.toBeInTheDocument();
  });

  it("hides Novos imóveis from a Platform Admin with stale property access", () => {
    useAuthStore.getState().setUser({
      id: 4,
      name: "Platform Admin",
      email: "platform@imobiliaria.com",
      is_platform_admin: true,
      permissions: ["properties.view"],
    });

    render(<DashboardContent />);

    expect(screen.queryByRole("link", { name: /^novos imóveis$/i })).not.toBeInTheDocument();
  });

  it("shows the totals of the modules the user can open", async () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      is_platform_admin: false,
      permissions: ["properties.view", "valuations.view"],
    });

    render(<DashboardContent />);

    expect(await screen.findByRole("link", { name: /^imóveis 12/i })).toHaveAttribute("href", "/properties");
    expect(await screen.findByRole("link", { name: /^avaliações 7/i })).toHaveAttribute("href", "/avaliacoes");
    expect(await screen.findByRole("link", { name: /^novidades 30/i })).toHaveAttribute("href", "/novos-imoveis");
  });
  it("lists the latest valuations and the next auctions", async () => {
    vi.mocked(getValuations).mockResolvedValueOnce({
      data: [
        {
          id: 9,
          code: "AVL-2026-000009",
          status: "calculated",
          status_label: "Calculada",
          subject_property: {
            city: "Jaraguá do Sul",
            neighborhood: "Centro",
            residential_type: "house",
            residential_type_label: "Casa",
            area: 180,
            bedrooms: 3,
            bathrooms: 2,
            garage_spaces: 2,
            flood_risk: false,
          },
          final_range: { min: 1, central: 2, max: 3, display: { min: "R$ 1", central: "R$ 640.000", max: "R$ 3" } },
          created_at: "2026-09-24T19:46:00-03:00",
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 5, total: 1 },
    } as unknown as Awaited<ReturnType<typeof getValuations>>);
    vi.mocked(getAuctions).mockResolvedValueOnce({
      data: [
        {
          id: 3,
          lot_number: null,
          title: "Casa no Centro",
          description: null,
          property_type: "house",
          canonical_url: null,
          address: null,
          neighborhood: "Centro",
          city: "Jaraguá do Sul",
          state: "SC",
          built_area_m2: null,
          land_area_m2: null,
          occupancy_status: "unknown",
          event: { title: "Leilão", sale_modality: "extrajudicial", status: "scheduled", auctioneer_name: null },
          round: { round_number: 1, starts_at: "2026-10-01T10:00:00-03:00", ends_at: null, minimum_bid: 50000, appraisal_value: 100000, status: "scheduled" },
          images: [],
          notice_url: null,
        },
      ],
      meta: { current_page: 1, last_page: 1, per_page: 4, total: 1 },
    });
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      is_platform_admin: false,
      permissions: ["valuations.view"],
    });

    render(<DashboardContent />);

    expect(await screen.findByRole("link", { name: "AVL-2026-000009" })).toHaveAttribute("href", "/avaliacoes");
    expect(screen.getByText("R$ 640.000")).toBeInTheDocument();
    expect(await screen.findByText("Casa no Centro")).toBeInTheDocument();
  });
});
