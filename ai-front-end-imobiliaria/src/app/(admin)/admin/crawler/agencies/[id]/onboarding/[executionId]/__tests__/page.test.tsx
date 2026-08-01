import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCrawlAgency, getOnboardingExecution } from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type { CrawlAgency } from "@/types/crawler";
import { onboardingExecution } from "@/components/features/crawler/agencies/__tests__/onboardingExecutionFixture";

import CrawlAgencyOnboardingExecutionPage from "../page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  usePathname: () => "/admin/crawler/agencies/42/onboarding/91",
}));

vi.mock("@/services/crawlerService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/crawlerService")>(),
  getCrawlAgency: vi.fn(),
  getOnboardingExecution: vi.fn(),
}));

const agency: CrawlAgency = {
  id: 42,
  name: "Crawl Agency Litoral",
  slug: "litoral",
  base_url: "https://litoral.example.com",
  root_domain: "litoral.example.com",
  lifecycle_state: "onboarding",
  health_state: "unknown",
  revalidation_required: false,
  current_published_crawl_run_id: null,
  active_discovery_policy_version_id: null,
  created_at: "2026-07-27T12:00:00Z",
  updated_at: "2026-07-27T12:00:00Z",
};

describe("CrawlAgencyOnboardingExecutionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().setUser({
      id: 1,
      name: "Operator",
      email: "operator@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "crawler.operations.execute"],
    });
  });

  it("renders a shareable immutable execution detail", async () => {
    const execution = onboardingExecution();
    vi.mocked(getCrawlAgency).mockResolvedValue(agency);
    vi.mocked(getOnboardingExecution).mockResolvedValue(execution);

    render(await CrawlAgencyOnboardingExecutionPage({
      params: Promise.resolve({ id: "42", executionId: "91" }),
    }));

    expect(getCrawlAgency).toHaveBeenCalledWith(42);
    expect(getOnboardingExecution).toHaveBeenCalledWith(91);
    expect(screen.getByRole("heading", { name: "Execução de Onboarding #91" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Onboarding" })).toHaveAttribute("aria-current", "page");
    const configuration = screen.getByRole("region", { name: "Configuração fixada" });
    expect(configuration).toHaveTextContent("Modelo v1");
    expect(configuration).toHaveTextContent("Discovery v1");
    expect(configuration).toHaveTextContent("sitemap");
    expect(screen.getByText("Tentativa 1 · Operação #101")).toBeInTheDocument();
  });

  it("preserves the immutable detail when polling fails", async () => {
    const execution = onboardingExecution();
    vi.mocked(getCrawlAgency).mockResolvedValue(agency);
    vi.mocked(getOnboardingExecution)
      .mockResolvedValueOnce(execution)
      .mockRejectedValueOnce(new Error("Network unavailable"));

    render(await CrawlAgencyOnboardingExecutionPage({
      params: Promise.resolve({ id: "42", executionId: "91" }),
    }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível atualizar esta execução. O detalhe abaixo mantém os últimos dados recebidos.",
    );
    expect(screen.getByRole("region", { name: "Configuração fixada" })).toBeInTheDocument();
  });
});
