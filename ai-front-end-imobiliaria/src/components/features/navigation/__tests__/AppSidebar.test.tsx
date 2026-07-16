import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppSidebar } from "../AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/useAuthStore";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

function renderSidebar() {
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </QueryClientProvider>
  );
}

describe("AppSidebar", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    useAuthStore.getState().clearAuth();
  });

  it("shows Avaliar imóvel for users with valuation permissions", () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Corretor",
      email: "corretor@example.com",
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
      permissions: ["crawler.view"],
    });

    renderSidebar();

    expect(
      screen.getByRole("link", { name: /operações do crawler/i }),
    ).toHaveAttribute("href", "/admin/crawler");
  });
});
