import { render, screen } from "@testing-library/react";
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

        expect(screen.getByRole("link", { name: "Voltar ao CRM" })).toHaveAttribute("href", "/");
    });
});
