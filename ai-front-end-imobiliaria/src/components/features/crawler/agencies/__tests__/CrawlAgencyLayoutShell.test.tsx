import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrawlAgency } from "@/types/crawler";

import { CrawlAgencyContextHeader } from "../CrawlAgencyContextHeader";
import { CrawlAgencyLayoutShell } from "../CrawlAgencyLayoutShell";

const mocks = vi.hoisted(() => ({
  pathname: "/admin/crawler/agencies/42",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
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

describe("CrawlAgencyLayoutShell", () => {
  it("renders a persistent header and suppresses duplicate headers from children", () => {
    mocks.pathname = "/admin/crawler/agencies/42";

    render(
      <CrawlAgencyLayoutShell initialAgency={agency}>
        <div data-testid="child-page">
          <CrawlAgencyContextHeader agency={agency} area="Visão geral" description="Conteúdo filho." />
          <p>Conteúdo da página</p>
        </div>
      </CrawlAgencyLayoutShell>,
    );

    // Only one header should exist in the DOM
    const headers = screen.getAllByRole("banner");
    expect(headers).toHaveLength(1);

    expect(screen.getByRole("heading", { name: "Visão geral" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
  });

  it("updates area and optimistic active tab immediately on tab click", () => {
    mocks.pathname = "/admin/crawler/agencies/42";

    render(
      <CrawlAgencyLayoutShell initialAgency={agency}>
        <div>Conteúdo da página</div>
      </CrawlAgencyLayoutShell>,
    );

    const onboardingTab = screen.getByRole("link", { name: "Onboarding" });
    expect(onboardingTab).not.toHaveAttribute("aria-current");

    fireEvent.click(onboardingTab);

    // Immediately shows Onboarding as current and updates header area
    expect(onboardingTab).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Onboarding" })).toBeInTheDocument();
    expect(
      screen.getByText("Execução atual, recuperação e histórico imutável desta Crawl Agency."),
    ).toBeInTheDocument();
  });

  it("syncs dynamic child metadata overrides such as execution details", async () => {
    mocks.pathname = "/admin/crawler/agencies/42/onboarding/91";

    render(
      <CrawlAgencyLayoutShell initialAgency={agency}>
        <CrawlAgencyContextHeader
          agency={agency}
          area="Execução de Onboarding #91"
          description="Detalhe imutável"
        />
      </CrawlAgencyLayoutShell>,
    );

    expect(
      await screen.findByRole("heading", { name: "Execução de Onboarding #91" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Detalhe imutável")).toBeInTheDocument();
  });
});
