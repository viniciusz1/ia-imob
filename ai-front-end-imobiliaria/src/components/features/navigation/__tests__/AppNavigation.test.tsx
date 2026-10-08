import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppNavigation } from "../AppNavigation";
import { useAuthStore } from "@/store/useAuthStore";

const mocks = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

function renderSidebar() {
  return render(<AppNavigation />);
}

describe("AppNavigation", () => {
  beforeEach(() => {
    mocks.pathname = "/";
    useAuthStore.getState().clearAuth();
  });

  it("marks the module of the current route as the active page", () => {
    mocks.pathname = "/properties/12/edit";
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      is_platform_admin: false,
      permissions: ["properties.view"],
    });

    renderSidebar();

    expect(screen.getByRole("link", { name: /^imóveis$/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /^dashboard$/i })).not.toHaveAttribute("aria-current");
  });

  it("does not confuse Avaliar imóvel with Análise de avaliações", () => {
    mocks.pathname = "/analitico/avaliacoes";
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      is_platform_admin: false,
      permissions: ["valuations.view", "analytics.market.view"],
    });

    renderSidebar();

    expect(screen.getByRole("link", { name: /análise de avaliações/i })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: /avaliar imóvel/i })).not.toHaveAttribute("aria-current");
  });

  it("shows Avaliar imóvel for users with valuation permissions", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      is_platform_admin: false,
      permissions: ["valuations.create"],
    });

    renderSidebar();

    expect(screen.getByRole("link", { name: /avaliar imóvel/i })).toBeInTheDocument();
  });

  it("hides Avaliar imóvel for users without valuation permissions", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
      is_platform_admin: false,
      permissions: ["properties.view"],
    });

    renderSidebar();

    expect(screen.queryByRole("link", { name: /avaliar imóvel/i })).not.toBeInTheDocument();
  });

  it("shows Operações do Crawler only with crawler view permission", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Platform Admin",
      email: "platform@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view"],
    });

    renderSidebar();

    expect(
      screen.getByRole("link", { name: /operações do crawler/i }),
    ).toHaveAttribute("href", "/admin/crawler");
    expect(screen.queryByRole("link", { name: /^imóveis$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^usuários$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^grupos$/i })).not.toBeInTheDocument();
  });

  it("hides Crawler Operations from an Agency Admin with stale permission", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Agency Admin",
      email: "admin@example.com",
      is_platform_admin: false,
      permissions: ["crawler.view"],
    });

    renderSidebar();

    expect(screen.queryByRole("link", { name: /operações do crawler/i })).not.toBeInTheDocument();
  });
});
