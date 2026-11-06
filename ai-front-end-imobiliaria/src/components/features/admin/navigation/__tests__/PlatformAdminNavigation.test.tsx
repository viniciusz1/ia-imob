import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/store/useAuthStore";
import { PlatformAdminNavigation, PlatformAdminTopbar } from "../PlatformAdminNavigation";

const mocks = vi.hoisted(() => ({ pathname: "/admin" }));

vi.mock("next/navigation", () => ({
    usePathname: () => mocks.pathname,
}));

function signIn(permissions: string[]) {
    useAuthStore.getState().setUser({
        id: 1,
        name: "Platform Admin",
        email: "platform@example.com",
        is_platform_admin: true,
        permissions,
    });
}

describe("PlatformAdminNavigation", () => {
    beforeEach(() => {
        mocks.pathname = "/admin";
        useAuthStore.getState().clearAuth();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("links a full Platform Admin to the overview, agencies and the crawler", () => {
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute("href", "/admin");
        expect(screen.getByRole("link", { name: "Agências" })).toHaveAttribute("href", "/admin/agencies");
        expect(screen.getByRole("link", { name: "Crawler" })).toHaveAttribute("href", "/admin/crawler");
    });

    it("marks the current section as the active page", () => {
        mocks.pathname = "/admin/agencies/12";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Agências" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Visão geral" })).not.toHaveAttribute("aria-current");
    });

    it("disables sections the user cannot reach instead of hiding them", () => {
        signIn(["crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.queryByRole("link", { name: "Agências" })).not.toBeInTheDocument();

        const blocked = screen.getAllByTitle("Requer a permissão platform.agencies.view");
        expect(blocked.map((item) => item.textContent)).toEqual(["Visão geral", "Agências"]);
        blocked.forEach((item) => expect(item).toHaveAttribute("aria-disabled", "true"));

        expect(screen.getByRole("link", { name: "Crawler" })).toBeInTheDocument();
    });

    it("offers a way back to the CRM", () => {
        signIn(["platform.agencies.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.queryByRole("link", { name: "Voltar ao CRM" })).not.toBeInTheDocument();
    });

    it("keeps the crawler pages out of the sidebar and marks Crawler as the open module", () => {
        mocks.pathname = "/admin/crawler/queue";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        const nav = screen.getByRole("navigation", { name: "Navegação da plataforma" });
        expect(within(nav).queryByRole("link", { name: "Fila" })).not.toBeInTheDocument();
        const current = within(nav).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
        expect(current.map((link) => link.getAttribute("href"))).toEqual(["/admin/crawler"]);
    });
});

describe("PlatformAdminTopbar", () => {
    beforeEach(() => {
        mocks.pathname = "/admin";
        useAuthStore.getState().clearAuth();
    });

    it("shows only the section title outside the crawler", () => {
        mocks.pathname = "/admin/agencies";

        render(<PlatformAdminTopbar />);

        expect(screen.getByText("Agências")).toBeInTheDocument();
        expect(screen.queryByRole("navigation", { name: "Páginas do Crawler" })).not.toBeInTheDocument();
    });

    it("lists the crawler pages as tabs while inside the crawler module", () => {
        mocks.pathname = "/admin/crawler";

        render(<PlatformAdminTopbar />);

        const tabs = screen.getByRole("navigation", { name: "Páginas do Crawler" });
        expect(within(tabs).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
            ["Visão geral", "/admin/crawler"],
            ["Prospecção", "/admin/crawler/prospects"],
            ["Fila", "/admin/crawler/queue"],
            ["Execuções em lote", "/admin/crawler/batches"],
            ["Agências", "/admin/crawler/agencies"],
            ["Qualidade", "/admin/crawler/quality"],
            ["Configurações", "/admin/crawler/settings"],
        ]);
    });

    it.each([
        ["/admin/crawler", "Visão geral"],
        ["/admin/crawler/runs/42", "Agências"],
        ["/admin/crawler/agencies/7/crawls", "Agências"],
        ["/admin/crawler/discoveries/42", "Agências"],
        ["/admin/crawler/queue", "Fila"],
        ["/admin/crawler/batches/3", "Execuções em lote"],
        ["/admin/crawler/quality", "Qualidade"],
    ])("marks the crawler page that owns %s as active", (pathname, label) => {
        mocks.pathname = pathname;

        render(<PlatformAdminTopbar />);

        const tabs = screen.getByRole("navigation", { name: "Páginas do Crawler" });
        const current = within(tabs).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
        expect(current.map((link) => link.textContent)).toEqual([label]);
    });
});
