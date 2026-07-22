import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrawlAgency } from "@/types/crawler";

import { CrawlAgencyContextHeader } from "../CrawlAgencyContextHeader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/crawler/agencies/42/profiles",
}));

const agency: CrawlAgency = {
  id: 42,
  name: "Imóveis Exemplo",
  slug: "imoveis-exemplo",
  base_url: "https://imoveis.example.com",
  root_domain: "imoveis.example.com",
  lifecycle_state: "onboarding",
  health_state: "unknown",
  revalidation_required: false,
  current_published_crawl_run_id: null,
  created_at: "2026-07-15T12:00:00Z",
  updated_at: "2026-07-15T12:00:00Z",
};

describe("CrawlAgencyContextHeader", () => {
  it("identifies the Crawler hierarchy, selected agency and current area", () => {
    render(<CrawlAgencyContextHeader agency={agency} area="Perfis de Extração" description="Configurações versionadas." />);

    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toHaveTextContent("Crawl Agencies/Imóveis Exemplo/Perfis de Extração");
    expect(screen.getByRole("heading", { name: "Imóveis Exemplo" })).toBeInTheDocument();
    expect(screen.getByText("imoveis.example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Perfis de Extração" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Perfis de Extração" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps agency navigation links keyboard focusable", () => {
    render(<CrawlAgencyContextHeader agency={agency} area="Perfis de Extração" />);

    const discoveries = screen.getByRole("link", { name: "Discoveries" });
    discoveries.focus();
    expect(discoveries).toHaveFocus();
    expect(discoveries).toHaveAttribute("href", "/admin/crawler/agencies/42/discoveries");
  });
});
