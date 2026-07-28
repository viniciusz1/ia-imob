import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  confirmOnboardingPlan,
  saveOnboardingPointConfiguration,
  updateOnboardingPlan,
} from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type {
  CrawlAgency,
  DiscoveryPolicyVersion,
  DiscoveryStrategy,
  ExtractionPolicyVersion,
  OnboardingExecution,
  OnboardingExecutionModelVersion,
  OnboardingPlan,
} from "@/types/crawler";

import { OnboardingPlanBuilder } from "../OnboardingPlanBuilder";

vi.mock("@/services/crawlerService", () => ({
  confirmOnboardingPlan: vi.fn(),
  saveOnboardingPointConfiguration: vi.fn(),
  updateOnboardingPlan: vi.fn(),
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

const discoveryPolicy: DiscoveryPolicyVersion = {
  id: 11,
  policy_key: "discovery-sitemap",
  name: "Sitemap + Homepage",
  version: 2,
  status: "available",
  strategies: ["sitemap", "homepage"],
  configuration: { max_urls: 500 },
  mutable: false,
  model_reference_count: 1,
  active_model_reference_count: 1,
  created_by: 1,
  created_at: "2026-07-27T12:00:00Z",
};

const extractionPolicy: ExtractionPolicyVersion = {
  id: 12,
  policy_key: "extraction-balanced",
  name: "Extração balanceada",
  version: 3,
  status: "available",
  strategies: ["xpath", "css", "fit_markdown_regex"],
  configuration: {},
  mutable: false,
  model_reference_count: 1,
  active_model_reference_count: 1,
  created_by: 1,
  created_at: "2026-07-27T12:00:00Z",
};

const model: OnboardingExecutionModelVersion = {
  id: 13,
  model_key: "model-balanced",
  name: "Modelo balanceado",
  version: 4,
  status: "available",
  is_default: true,
  mutable: false,
  discovery_policy_version_id: discoveryPolicy.id,
  discovery_policy: discoveryPolicy,
  extraction_policy_version_id: extractionPolicy.id,
  extraction_policy: extractionPolicy,
  plan_reference_count: 0,
  execution_reference_count: 0,
  created_by: 1,
  created_at: "2026-07-27T12:00:00Z",
};

const plan: OnboardingPlan = {
  id: 14,
  prospect_id: 8,
  crawl_agency_id: agency.id,
  name: null,
  conduction: null,
  status: "draft",
  steps: [],
  execution_model_version_id: null,
  execution_model: null,
  manual_configuration: null,
  first_production_discovery_mode: "fresh",
  confirmed_by: null,
  confirmed_at: null,
  created_by: 1,
  created_at: "2026-07-27T12:00:00Z",
  updated_at: "2026-07-27T12:00:00Z",
};

const strategies: DiscoveryStrategy[] = [
  { id: 1, key: "sitemap", label: "Sitemap", kind: "native", safety_status: "safe", active: true, created_by: null, created_at: "2026-07-27T12:00:00Z" },
  { id: 2, key: "homepage", label: "Homepage", kind: "native", safety_status: "safe", active: true, created_by: null, created_at: "2026-07-27T12:00:00Z" },
];

const execution = {
  id: 91,
  name: "Execução",
  state: "queued",
} as OnboardingExecution;

function renderBuilder() {
  return render(
    <OnboardingPlanBuilder
      agency={agency}
      discoveryPolicies={[discoveryPolicy]}
      discoveryStrategies={strategies}
      extractionPolicies={[extractionPolicy]}
      models={[model]}
      onConfirmed={vi.fn()}
      plan={plan}
      snapshots={[]}
    />,
  );
}

describe("OnboardingPlanBuilder", () => {
  beforeEach(() => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Operator",
      email: "operator@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "crawler.operations.execute", "crawler.policies.manage"],
    });
    vi.mocked(updateOnboardingPlan).mockResolvedValue({ ...plan, status: "draft" });
    vi.mocked(confirmOnboardingPlan).mockResolvedValue(execution);
  });

  it("suggests a name, resolves the selected model, and freezes the reviewed combination", async () => {
    renderBuilder();

    expect((screen.getByLabelText("Nome da execução") as HTMLInputElement).value).toContain("Crawl Agency Litoral");
    expect(screen.getByLabelText("Configuração resolvida do modelo")).toHaveTextContent("Sitemap + Homepage");
    expect(screen.getByLabelText("Configuração resolvida do modelo")).toHaveTextContent("Extração balanceada");
    expect(screen.getByLabelText("Modo de Discovery")).toHaveValue("fresh");

    fireEvent.click(screen.getByLabelText(/Revisei a combinação/));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e iniciar execução" }));

    await waitFor(() => expect(updateOnboardingPlan).toHaveBeenCalledWith(
      agency.id,
      expect.objectContaining({
        conduction: "automated",
        execution_model_version_id: model.id,
        first_production_discovery_mode: "fresh",
      }),
    ));
    expect(confirmOnboardingPlan).toHaveBeenCalledWith(agency.id);
  });

  it("keeps the current manual stage-by-stage flow without an execution model", async () => {
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Manual, etapa por etapa/ }));
    fireEvent.click(screen.getByRole("button", { name: "Configuração Pontual" }));
    fireEvent.click(screen.getByRole("button", { name: /Sem modelo/ }));

    expect(screen.getByText(/sobrescrita vale somente para esta execução/i)).toBeInTheDocument();
    expect(screen.getByText(/estratégias rodam na ordem exibida/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() => expect(updateOnboardingPlan).toHaveBeenCalledWith(
      agency.id,
      expect.objectContaining({
        conduction: "manual",
        manual_configuration: expect.objectContaining({
          discovery: expect.objectContaining({
            mode: "fresh",
            point_configuration: expect.objectContaining({ strategies: ["sitemap", "homepage"] }),
          }),
          extraction: expect.objectContaining({
            point_configuration: expect.objectContaining({
              strategies: ["xpath", "css", "fit_markdown_regex", "fit_markdown_llm", "llm_full_html"],
            }),
          }),
        }),
      }),
    ));
  });

  it("does not expose mutations to a read-only operator", () => {
    useAuthStore.getState().setUser({
      id: 2,
      name: "Viewer",
      email: "viewer@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view"],
    });

    renderBuilder();

    expect(screen.getByText(/Modo somente leitura/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar rascunho" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar e iniciar execução" })).not.toBeInTheDocument();
  });

  it("creates and selects a new active policy only after separate confirmation", async () => {
    vi.mocked(saveOnboardingPointConfiguration).mockResolvedValue({
      ...discoveryPolicy,
      id: 55,
      policy_key: "explicit-point",
      name: "Discovery Litoral pontual",
      version: 1,
      model_reference_count: 0,
      active_model_reference_count: 0,
    });
    renderBuilder();

    fireEvent.click(screen.getByRole("button", { name: /Manual, etapa por etapa/ }));
    fireEvent.click(screen.getByRole("button", { name: "Configuração Pontual" }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar como nova política ativa" }));
    fireEvent.change(screen.getByLabelText("Nome da nova política"), { target: { value: "Discovery Litoral pontual" } });

    expect(screen.getByRole("button", { name: "Criar nova política" })).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/Confirmo a criação de uma nova política/));
    fireEvent.click(screen.getByRole("button", { name: "Criar nova política" }));

    await waitFor(() => expect(saveOnboardingPointConfiguration).toHaveBeenCalledWith(
      agency.id,
      "discovery",
      "Discovery Litoral pontual",
    ));
    expect(screen.getByLabelText("Política de Discovery")).toHaveValue("55");
  });
});
