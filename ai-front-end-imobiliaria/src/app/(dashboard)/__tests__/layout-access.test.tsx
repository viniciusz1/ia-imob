import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import DashboardLayout from "../layout";

const mocks = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), usePathname: () => "/analitico/avaliacoes" }));
vi.mock("@/components/features/auth/RestoreAuthSession", () => ({ RestoreAuthSession: () => null }));
vi.mock("@/components/features/auth/UserNav", () => ({ UserNav: () => <span>Conta</span> }));
vi.mock("@/components/features/navigation/AppNavigation", () => ({ AppNavigation: () => <span>Menu CRM</span>, AppTopbarTitle: () => null }));

describe("acesso ao CRM", () => {
    beforeEach(() => { useAuthStore.getState().clearAuth(); mocks.replace.mockReset(); });

    it("redireciona administrador da plataforma e não exibe módulos do CRM", async () => {
        useAuthStore.getState().setUser({ id: 1, name: "Admin", email: "admin@example.com", is_platform_admin: true, permissions: ["platform.agencies.view", "analytics.market.view"] });
        render(<DashboardLayout><span>Conteúdo CRM</span></DashboardLayout>);
        await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/admin"));
        expect(screen.queryByText("Conteúdo CRM")).not.toBeInTheDocument();
        expect(screen.queryByText("Menu CRM")).not.toBeInTheDocument();
    });

    it("mantém a conta acessível quando não há permissão administrativa", () => {
        useAuthStore.getState().setUser({ id: 1, name: "Admin", email: "admin@example.com", is_platform_admin: true, permissions: [] });
        render(<DashboardLayout><span>Conteúdo CRM</span></DashboardLayout>);
        expect(screen.getByText(/não possui acesso/)).toBeInTheDocument();
        expect(screen.getByText("Conta")).toBeInTheDocument();
        expect(mocks.replace).not.toHaveBeenCalled();
    });
});
