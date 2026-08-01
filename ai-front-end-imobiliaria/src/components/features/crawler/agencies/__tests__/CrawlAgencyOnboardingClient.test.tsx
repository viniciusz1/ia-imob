import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOnboardingExecution } from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type { CrawlAgency } from "@/types/crawler";

import { CrawlAgencyOnboardingClient } from "../CrawlAgencyOnboardingClient";
import { onboardingExecution as execution } from "./onboardingExecutionFixture";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/crawler/agencies/42/onboarding",
}));

vi.mock("@/services/crawlerService", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/crawlerService")>(),
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

describe("CrawlAgencyOnboardingClient", () => {
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

  it("shows an explicit empty state in the dedicated Onboarding area", () => {
    render(<CrawlAgencyOnboardingClient agency={agency} initialExecutions={[]} />);

    expect(screen.getByRole("heading", { name: "Onboarding" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Onboarding" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("Nenhuma Execução de Onboarding foi iniciada.")).toBeInTheDocument();
  });

  it("shows the complete current execution and keeps it updated by polling", async () => {
    const current = execution();
    const updated = execution({
      operations: [{
        ...current.operations[0],
        progress: { stage: "discovery", percentage: 80, message: "80 URLs encontradas" },
      }],
    });
    vi.mocked(getOnboardingExecution).mockResolvedValue(updated);

    render(<CrawlAgencyOnboardingClient agency={agency} initialExecutions={[current]} />);

    expect(screen.getByRole("heading", { name: "Execução atual" })).toBeInTheDocument();
    expect(screen.getByText("Onboarding Litoral")).toBeInTheDocument();
    expect(screen.getByText("Tentativa 1 · Operação #101")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir detalhe da execução #91" })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/42/onboarding/91",
    );
    expect(await screen.findByText(/80 URLs encontradas/)).toBeInTheDocument();
  });

  it("lists previous executions with operational identity and a shareable detail link", () => {
    const current = execution({ state: "completed", current_step: "quality_gate", completed_at: "2026-07-28T12:00:00Z" });
    const historical = execution({
      id: 90,
      name: "Onboarding anterior",
      conduction: "manual",
      state: "cancelled",
      current_step: "profile_validation",
      execution_model_version_id: null,
      resolved_configuration: {
        ...current.resolved_configuration,
        execution_model: null,
      },
      created_by: { id: 7, name: "Crawler Operator" },
      started_at: "2026-07-26T12:00:00Z",
      completed_at: "2026-07-27T12:00:00Z",
    });

    render(<CrawlAgencyOnboardingClient agency={agency} initialExecutions={[current, historical]} />);

    const history = screen.getByRole("region", { name: "Histórico de Execuções de Onboarding" });
    expect(history).toHaveTextContent("#90 · Onboarding anterior");
    expect(history).toHaveTextContent("Manual · Sem modelo");
    expect(history).toHaveTextContent("Última etapa: Crawl de Validação");
    expect(history).toHaveTextContent("Responsável: Crawler Operator");
    expect(screen.getByRole("link", { name: "Abrir execução #90" })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/42/onboarding/90",
    );
  });

  it("keeps the last execution visible when polling fails", async () => {
    const current = execution();
    vi.mocked(getOnboardingExecution).mockRejectedValue(new Error("Network unavailable"));

    render(<CrawlAgencyOnboardingClient agency={agency} initialExecutions={[current]} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível atualizar a Execução de Onboarding. Os últimos dados recebidos continuam visíveis.",
    );
    expect(screen.getByText("Onboarding Litoral")).toBeInTheDocument();
  });
});
