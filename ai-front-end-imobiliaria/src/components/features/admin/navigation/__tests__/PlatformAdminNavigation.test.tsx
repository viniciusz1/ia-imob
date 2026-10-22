import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/store/useAuthStore";
import { PlatformAdminNavigation } from "../PlatformAdminNavigation";

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

    it("links a full Platform Admin to Clientes and expandable Crawler with its submodules", () => {
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute("href", "/admin");
        expect(screen.getByRole("link", { name: "Agências" })).toHaveAttribute("href", "/admin/agencies");

        const crawlerButton = screen.getByRole("button", { name: "Crawler" });
        expect(crawlerButton).toBeInTheDocument();
        expect(crawlerButton).toHaveAttribute("aria-expanded", "false");

        // Submodules are not visible yet
        expect(screen.queryByRole("link", { name: "Prospecção" })).not.toBeInTheDocument();

        // Click to open Crawler
        fireEvent.click(crawlerButton);
        expect(crawlerButton).toHaveAttribute("aria-expanded", "true");

        // Submodules are now visible
        expect(screen.getByRole("link", { name: "Visão geral do Crawler" })).toHaveAttribute("href", "/admin/crawler");
        expect(screen.getByRole("link", { name: "Prospecção" })).toHaveAttribute("href", "/admin/crawler/prospects");
        expect(screen.getByRole("link", { name: "Fila" })).toHaveAttribute("href", "/admin/crawler/queue");
        expect(screen.getByRole("link", { name: "Crawl Agencies" })).toHaveAttribute("href", "/admin/crawler/agencies");
        expect(screen.getByRole("link", { name: "Qualidade" })).toHaveAttribute("href", "/admin/crawler/quality");
        expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/admin/crawler/settings");

        // Click again to close Crawler
        fireEvent.click(crawlerButton);
        expect(crawlerButton).toHaveAttribute("aria-expanded", "false");
        expect(screen.queryByRole("link", { name: "Prospecção" })).not.toBeInTheDocument();
    });

    it("auto-expands Crawler and marks the current section as active on crawler routes", () => {
        mocks.pathname = "/admin/crawler/agencies";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        const crawlerButton = screen.getByRole("button", { name: "Crawler" });
        expect(crawlerButton).toHaveAttribute("aria-expanded", "true");

        expect(screen.getByRole("link", { name: "Crawl Agencies" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Visão geral do Crawler" })).not.toHaveAttribute("aria-current");
        expect(screen.getByRole("link", { name: "Visão geral" })).not.toHaveAttribute("aria-current");
    });

    it("marks Visão geral do Crawler as active when on /admin/crawler", () => {
        mocks.pathname = "/admin/crawler";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Visão geral do Crawler" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Visão geral" })).not.toHaveAttribute("aria-current");
    });

    it("marks Queue active on the queue page", () => {
        mocks.pathname = "/admin/crawler/queue";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Fila" })).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", { name: "Visão geral do Crawler" })).not.toHaveAttribute("aria-current");
    });

    it("keeps Crawl Agencies active on agency workflow detail pages", () => {
        mocks.pathname = "/admin/crawler/runs/42";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Crawl Agencies" })).toHaveAttribute("aria-current", "page");
    });

    it("marks Quality active throughout the quality workflow", () => {
        mocks.pathname = "/admin/crawler/quality";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Qualidade" })).toHaveAttribute("aria-current", "page");
    });

    it("marks Settings active on the settings page", () => {
        mocks.pathname = "/admin/crawler/settings";
        signIn(["platform.agencies.view", "crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("aria-current", "page");
    });

    it("disables sections the user cannot reach instead of hiding them", () => {
        signIn(["crawler.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.queryByRole("link", { name: "Agências" })).not.toBeInTheDocument();

        const blocked = screen.getAllByTitle("Requer a permissão platform.agencies.view");
        expect(blocked.map((item) => item.textContent)).toEqual(["Visão geral", "Agências"]);
        blocked.forEach((item) => expect(item).toHaveAttribute("aria-disabled", "true"));

        expect(screen.getByRole("button", { name: "Crawler" })).toBeInTheDocument();
    });

    it("disables Crawler when the user lacks crawler.view permission", () => {
        signIn(["platform.agencies.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.queryByRole("button", { name: "Crawler" })).not.toBeInTheDocument();
        const crawlerBlocked = screen.getByTitle("Requer a permissão crawler.view");
        expect(crawlerBlocked).toHaveAttribute("aria-disabled", "true");
        expect(crawlerBlocked).toHaveTextContent("Crawler");
    });

    it("offers a way back to the CRM", () => {
        signIn(["platform.agencies.view"]);

        render(<PlatformAdminNavigation />);

        expect(screen.getByRole("link", { name: "Voltar ao CRM" })).toHaveAttribute("href", "/");
    });
});
