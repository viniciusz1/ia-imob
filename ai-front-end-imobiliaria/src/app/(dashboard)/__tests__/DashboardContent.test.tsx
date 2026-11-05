import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as renderWithoutProviders, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { DashboardContent } from "../DashboardContent";
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
});
