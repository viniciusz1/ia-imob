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

function setUserPermissions(permissions: string[]) {
  useAuthStore.getState().setUser({
    id: 1,
    name: "Usuário",
    email: "usuario@example.com",
    permissions,
  });
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

  it("shows always-visible items regardless of permissions", () => {
    setUserPermissions([]);

    renderSidebar();

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /imóveis/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /buscador com ia/i })).toBeInTheDocument();
  });

  it("shows Avaliar imóvel for users with valuation permissions", () => {
    setUserPermissions(["valuations.create"]);

    renderSidebar();

    expect(screen.getByRole("link", { name: /avaliar imóvel/i })).toBeInTheDocument();
  });

  it("hides Avaliar imóvel for users without valuation permissions", () => {
    setUserPermissions(["properties.view"]);

    renderSidebar();

    expect(screen.queryByRole("link", { name: /avaliar imóvel/i })).not.toBeInTheDocument();
  });

  it("shows Usuários only for users with users.view permission", () => {
    setUserPermissions(["users.view"]);

    renderSidebar();

    expect(screen.getByRole("link", { name: /usuários/i })).toBeInTheDocument();
  });

  it("hides Usuários for users without users.view permission", () => {
    setUserPermissions(["properties.view"]);

    renderSidebar();

    expect(screen.queryByRole("link", { name: /usuários/i })).not.toBeInTheDocument();
  });

  it("shows Grupos only for users with roles.manage permission", () => {
    setUserPermissions(["roles.manage"]);

    renderSidebar();

    expect(screen.getByRole("link", { name: /grupos/i })).toBeInTheDocument();
  });

  it("hides Grupos for users without roles.manage permission", () => {
    setUserPermissions(["properties.view"]);

    renderSidebar();

    expect(screen.queryByRole("link", { name: /grupos/i })).not.toBeInTheDocument();
  });

  it("shows Plano & Assinatura only for users with subscriptions.view permission", () => {
    setUserPermissions(["subscriptions.view"]);

    renderSidebar();

    expect(screen.getByRole("link", { name: /plano & assinatura/i })).toBeInTheDocument();
  });

  it("hides Plano & Assinatura for users without subscriptions.view permission", () => {
    setUserPermissions(["properties.view"]);

    renderSidebar();

    expect(screen.queryByRole("link", { name: /plano & assinatura/i })).not.toBeInTheDocument();
  });

  it("shows Configurações do site only for users with site_settings.view permission", () => {
    setUserPermissions(["site_settings.view"]);

    renderSidebar();

    expect(screen.getByRole("link", { name: /configurações do site/i })).toBeInTheDocument();
  });

  it("hides Configurações do site for users without site_settings.view permission", () => {
    setUserPermissions(["properties.view"]);

    renderSidebar();

    expect(screen.queryByRole("link", { name: /configurações do site/i })).not.toBeInTheDocument();
  });

  it("renders all navigation items when permissions are still loading", () => {
    useAuthStore.getState().clearAuth();

    renderSidebar();

    expect(screen.getByRole("link", { name: /usuários/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /grupos/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /plano & assinatura/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /configurações do site/i })).toBeInTheDocument();
  });
});
