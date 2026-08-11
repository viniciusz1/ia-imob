import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import type { AgencySummary } from "@/services/adminApi";
import { useAuthStore } from "@/store/useAuthStore";
import { PlatformOverviewClient } from "../PlatformOverviewClient";

function agency(overrides: Partial<AgencySummary> = {}): AgencySummary {
    return {
        id: 1,
        name: "Imobiliária Exemplo",
        slug: "exemplo",
        is_active: true,
        owner_user_id: null,
        created_at: new Date().toISOString(),
        updated_at: null,
        ...overrides,
    };
}

function signIn(permissions: string[]) {
    useAuthStore.getState().setUser({
        id: 1,
        name: "Platform Admin",
        email: "platform@example.com",
        is_platform_admin: true,
        permissions,
    });
}

function statValue(label: string): string {
    const heading = screen.getByText(label);
    const card = heading.closest("div[data-slot='card']") ?? heading.parentElement;

    return within(card as HTMLElement).getByText(/^\d+$/).textContent ?? "";
}

describe("PlatformOverviewClient", () => {
    beforeEach(() => {
        useAuthStore.getState().clearAuth();
    });

    it("counts agencies by status", () => {
        signIn(["platform.agencies.view"]);
        const old = new Date("2024-01-05T12:00:00Z").toISOString();

        render(
            <PlatformOverviewClient
                agencies={[
                    agency({ id: 1, name: "Ativa Recente" }),
                    agency({ id: 2, name: "Ativa Antiga", created_at: old }),
                    agency({ id: 3, name: "Desativada", is_active: false, created_at: old }),
                ]}
            />,
        );

        expect(statValue("Agências")).toBe("3");
        expect(statValue("Ativas")).toBe("2");
        expect(statValue("Desativadas")).toBe("1");
        expect(statValue("Novas")).toBe("1");
    });

    it("links each recent agency to its detail page", () => {
        signIn(["platform.agencies.view"]);

        render(<PlatformOverviewClient agencies={[agency({ id: 42, name: "Vale Sul" })]} />);

        expect(screen.getByRole("link", { name: "Vale Sul" })).toHaveAttribute(
            "href",
            "/admin/agencies/42",
        );
        expect(screen.getByRole("link", { name: /ver todas/i })).toHaveAttribute(
            "href",
            "/admin/agencies",
        );
    });

    it("points to the registration flow when no agency exists yet", () => {
        signIn(["platform.agencies.view"]);

        render(<PlatformOverviewClient agencies={[]} />);

        expect(screen.getByRole("link", { name: /cadastrar a primeira/i })).toHaveAttribute(
            "href",
            "/admin/agencies/new",
        );
    });

    it("shows the crawler shortcut only to users who can view it", () => {
        signIn(["platform.agencies.view"]);
        const { unmount } = render(<PlatformOverviewClient agencies={[agency()]} />);

        expect(screen.queryByRole("link", { name: /abrir o crawler/i })).not.toBeInTheDocument();
        unmount();

        signIn(["platform.agencies.view", "crawler.view"]);
        render(<PlatformOverviewClient agencies={[agency()]} />);

        expect(screen.getByRole("link", { name: /abrir o crawler/i })).toHaveAttribute(
            "href",
            "/admin/crawler",
        );
    });
});
