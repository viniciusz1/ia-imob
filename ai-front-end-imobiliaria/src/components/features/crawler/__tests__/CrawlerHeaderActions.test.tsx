import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "@/store/useAuthStore";

import { CrawlerHeaderActions } from "../CrawlerHeaderActions";

function signIn(permissions: string[]) {
  useAuthStore.getState().setUser({
    id: 1,
    name: "Crawler Operator",
    email: "operator@example.com",
    is_platform_admin: true,
    permissions,
  });
}

describe("CrawlerHeaderActions", () => {
  beforeEach(() => {
    useAuthStore.getState().clearAuth();
  });

  it("shows the actions allowed by the operator permissions", () => {
    signIn(["crawler.view", "crawler.prospects.manage", "crawler.agencies.manage"]);

    render(<CrawlerHeaderActions actions={["registerAgency", "newProspecting"]} />);

    expect(screen.getByRole("link", { name: "Nova prospecção" })).toHaveAttribute("href", "/admin/crawler/prospects#nova-prospeccao");
    expect(screen.getByRole("link", { name: "Cadastrar agência" })).toHaveAttribute("href", "/admin/crawler/agencies/new");
  });

  it("does not expose mutation actions to a read-only operator", () => {
    signIn(["crawler.view"]);

    render(<CrawlerHeaderActions actions={["registerAgency", "newProspecting"]} />);

    expect(screen.queryByRole("link", { name: "Nova prospecção" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cadastrar agência" })).not.toBeInTheDocument();
  });
});
