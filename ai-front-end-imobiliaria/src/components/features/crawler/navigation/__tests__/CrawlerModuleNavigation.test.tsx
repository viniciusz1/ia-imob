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

  it("renders the crawler module header and description", () => {
    render(<CrawlerModuleNavigation />);

    expect(screen.getByRole("heading", { name: "Crawler" })).toBeInTheDocument();
    expect(
      screen.getByText("Operação e qualidade das fontes de dados imobiliários."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Navegação do Crawler" })).not.toBeInTheDocument();
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

  it("shows contextual action on prospects page", () => {
    mocks.pathname = "/admin/crawler/prospects";
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
    expect(screen.queryByRole("link", { name: "Cadastrar agência" })).not.toBeInTheDocument();
  });

  it("shows contextual action on agencies page", () => {
    mocks.pathname = "/admin/crawler/agencies";
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

    expect(screen.getByRole("link", { name: "Cadastrar agência" })).toHaveAttribute("href", "/admin/crawler/agencies/new");
    expect(screen.queryByRole("link", { name: "Nova prospecção" })).not.toBeInTheDocument();
  });

  it("does not expose mutation actions to a read-only operator", () => {
    render(<CrawlerModuleNavigation />);

    expect(screen.queryByRole("link", { name: "Nova prospecção" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cadastrar agência" })).not.toBeInTheDocument();
  });
});
