import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuthStore } from "@/store/useAuthStore";

import { CrawlerModuleNavigation } from "../CrawlerModuleNavigation";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/crawler",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

describe("CrawlerModuleNavigation", () => {
  beforeEach(() => {
    mocks.pathname = "/admin/crawler";
    useAuthStore.getState().setUser({
      id: 1,
      name: "Crawler Viewer",
      email: "viewer@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view"],
    });
  });

  it("shows every crawler section and marks the overview as active", () => {
    render(<CrawlerModuleNavigation />);

    expect(screen.getByRole("link", { name: "Visão geral" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Prospecção" })).toHaveAttribute("href", "/admin/crawler/prospects");
    expect(screen.getByRole("link", { name: "Crawl Agencies" })).toHaveAttribute("href", "/admin/crawler/agencies");
    expect(screen.getByRole("link", { name: "Operações" })).toHaveAttribute("href", "/admin/crawler/operations");
    expect(screen.getByRole("link", { name: "Qualidade" })).toHaveAttribute("href", "/admin/crawler/quality");
    expect(screen.getByRole("link", { name: "Configurações" })).toHaveAttribute("href", "/admin/crawler/settings");
  });

  it("keeps Crawl Agencies active on agency workflow detail pages", () => {
    mocks.pathname = "/admin/crawler/runs/42";

    render(<CrawlerModuleNavigation />);

    expect(screen.getByRole("link", { name: "Crawl Agencies" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Visão geral" })).not.toHaveAttribute("aria-current");
  });

  it("keeps Operations active when inspecting a discovery snapshot", () => {
    mocks.pathname = "/admin/crawler/discoveries/42";

    render(<CrawlerModuleNavigation />);

    expect(screen.getByRole("link", { name: "Operações" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Crawl Agencies" })).not.toHaveAttribute("aria-current");
  });

  it("marks Quality active throughout the quality workflow", () => {
    mocks.pathname = "/admin/crawler/quality";

    render(<CrawlerModuleNavigation />);

    expect(screen.getByRole("link", { name: "Qualidade" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Operações" })).not.toHaveAttribute("aria-current");
  });

  it("shows overview actions allowed by the operator permissions", () => {
    useAuthStore.getState().setUser({
      id: 2,
      name: "Crawler Manager",
      email: "manager@example.com",
      is_platform_admin: true,
      permissions: [
        "crawler.view",
        "crawler.prospects.manage",
        "crawler.agencies.manage",
      ],
    });

    render(<CrawlerModuleNavigation />);

    expect(screen.getByRole("link", { name: "Nova prospecção" })).toHaveAttribute("href", "/admin/crawler/prospects#nova-prospeccao");
    expect(screen.getByRole("link", { name: "Cadastrar agência" })).toHaveAttribute("href", "/admin/crawler/agencies/new");
  });

  it("does not expose mutation actions to a read-only operator", () => {
    render(<CrawlerModuleNavigation />);

    expect(screen.queryByRole("link", { name: "Nova prospecção" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cadastrar agência" })).not.toBeInTheDocument();
  });

  it("does not offer discovery creation from the global operations queue", () => {
    mocks.pathname = "/admin/crawler/operations";
    useAuthStore.getState().setUser({
      id: 3,
      name: "Crawler Executor",
      email: "executor@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "crawler.operations.execute"],
    });

    render(<CrawlerModuleNavigation />);

    expect(screen.queryByRole("link", { name: "Enfileirar discovery" })).not.toBeInTheDocument();
  });
});
