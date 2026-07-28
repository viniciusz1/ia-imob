import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  DiscoveryPolicyVersion,
  ExtractionPolicyVersion,
  OnboardingExecutionModelVersion,
} from "@/types/crawler";

import { OnboardingCatalogsClient } from "../OnboardingCatalogsClient";

const serviceMocks = vi.hoisted(() => ({
  archiveDiscoveryPolicyVersion: vi.fn(),
  archiveExtractionPolicyVersion: vi.fn(),
  archiveOnboardingExecutionModelVersion: vi.fn(),
  createDiscoveryPolicyVersion: vi.fn(),
  createDiscoveryPolicyVersionFrom: vi.fn(),
  createDiscoveryStrategy: vi.fn(),
  createExtractionPolicyVersion: vi.fn(),
  createExtractionPolicyVersionFrom: vi.fn(),
  createOnboardingExecutionModelVersion: vi.fn(),
  createOnboardingExecutionModelVersionFrom: vi.fn(),
  makeOnboardingExecutionModelDefault: vi.fn(),
  publishDiscoveryPolicyVersion: vi.fn(),
  publishExtractionPolicyVersion: vi.fn(),
  publishOnboardingExecutionModelVersion: vi.fn(),
  updateDiscoveryPolicyVersion: vi.fn(),
  updateExtractionPolicyVersion: vi.fn(),
  updateOnboardingExecutionModelVersion: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/services/crawlerService", () => serviceMocks);
vi.mock("sonner", () => ({ toast: toastMocks }));

const discoveryPolicy: DiscoveryPolicyVersion = {
  id: 10,
  policy_key: "discovery-key",
  name: "Discovery nacional",
  version: 2,
  status: "available",
  strategies: ["sitemap", "homepage"],
  configuration: { max_urls: 1000 },
  mutable: false,
  model_reference_count: 1,
  active_model_reference_count: 1,
  created_by: 1,
  created_at: "2026-07-27T12:00:00Z",
};

const extractionPolicy: ExtractionPolicyVersion = {
  id: 20,
  policy_key: "extraction-key",
  name: "Extração resiliente",
  version: 3,
  status: "available",
  strategies: ["xpath", "fit_markdown_llm"],
  configuration: {},
  mutable: false,
  model_reference_count: 1,
  active_model_reference_count: 1,
  created_by: 1,
  created_at: "2026-07-27T12:00:00Z",
};

const onboardingModel: OnboardingExecutionModelVersion = {
  id: 30,
  model_key: "model-key",
  name: "Onboarding completo",
  version: 4,
  status: "available",
  is_default: true,
  mutable: false,
  discovery_policy_version_id: discoveryPolicy.id,
  discovery_policy: discoveryPolicy,
  extraction_policy_version_id: extractionPolicy.id,
  extraction_policy: extractionPolicy,
  plan_reference_count: 2,
  execution_reference_count: 5,
  created_by: 1,
  created_at: "2026-07-27T12:00:00Z",
};

describe("OnboardingCatalogsClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows explicit empty states and requires published policies before a model", () => {
    renderCatalogs();

    expect(screen.getByText(/publique ao menos uma política de discovery/i)).toBeInTheDocument();
    expect(screen.getByText("Nenhum modelo de onboarding criado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar combinação" })).toBeDisabled();

    activateTab("Discovery");
    expect(screen.getByLabelText("Sitemap")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma política de discovery criada.")).toBeInTheDocument();

    activateTab("Extração");
    expect(screen.getByLabelText("XPath")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma política de extração criada.")).toBeInTheDocument();
  });

  it("shows exact immutable references, usage counts, and the global default", () => {
    renderCatalogs({
      initialDiscoveryPolicies: [discoveryPolicy],
      initialExtractionPolicies: [extractionPolicy],
      initialModels: [onboardingModel],
    });

    expect(screen.getByText("Onboarding completo · v4")).toBeInTheDocument();
    expect(screen.getByText("Padrão global")).toBeInTheDocument();
    expect(screen.getByText("Discovery: Discovery nacional · v2")).toBeInTheDocument();
    expect(screen.getByText("Extração: Extração resiliente · v3")).toBeInTheDocument();
    expect(screen.getByText(/2 plano\(s\) e 5 execução\(ões\)/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salvar combinação" })).not.toBeInTheDocument();
  });

  it("allows archiving a policy when its only references are historical", () => {
    renderCatalogs({
      initialDiscoveryPolicies: [{
        ...discoveryPolicy,
        active_model_reference_count: 0,
      }],
    });

    activateTab("Discovery");

    expect(screen.getByText(/1 modelo\(s\); 0 ainda selecionável/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arquivar" })).toBeEnabled();
  });

  it("creates an extraction draft with the fixed canonical strategy order", async () => {
    const created: ExtractionPolicyVersion = {
      ...extractionPolicy,
      id: 21,
      policy_key: "new-extraction-key",
      name: "Fallback premium",
      version: 1,
      status: "draft",
      mutable: true,
      model_reference_count: 0,
      strategies: ["xpath", "llm_full_html"],
    };
    serviceMocks.createExtractionPolicyVersion.mockResolvedValue(created);
    renderCatalogs();

    activateTab("Extração");
    fireEvent.change(screen.getByLabelText("Nome da política"), {
      target: { value: "Fallback premium" },
    });
    fireEvent.click(screen.getByLabelText("HTML completo + IA"));
    fireEvent.click(screen.getByLabelText("XPath"));
    fireEvent.click(screen.getByRole("button", { name: "Criar rascunho" }));

    await waitFor(() => expect(serviceMocks.createExtractionPolicyVersion).toHaveBeenCalledWith({
      name: "Fallback premium",
      strategies: ["xpath", "llm_full_html"],
      configuration: {},
    }));
    expect(await screen.findByText("Fallback premium · v1")).toBeInTheDocument();
    expect(toastMocks.success).toHaveBeenCalledWith("Política criada em rascunho.");
  });

  it("surfaces API validation errors without losing the form", async () => {
    serviceMocks.createDiscoveryPolicyVersion.mockRejectedValue({
      isAxiosError: true,
      response: { data: { errors: { name: ["Este nome já está em uso."] } } },
    });
    renderCatalogs();

    activateTab("Discovery");
    fireEvent.change(screen.getByLabelText("Nome da política"), {
      target: { value: "Duplicada" },
    });
    fireEvent.click(screen.getByLabelText("Sitemap"));
    fireEvent.click(screen.getByRole("button", { name: "Criar rascunho" }));

    await waitFor(() => expect(toastMocks.error).toHaveBeenCalledWith("Este nome já está em uso."));
    expect(screen.getByLabelText("Nome da política")).toHaveValue("Duplicada");
  });
});

function renderCatalogs(overrides: Partial<Parameters<typeof OnboardingCatalogsClient>[0]> = {}) {
  return render(
    <OnboardingCatalogsClient
      initialDiscoveryPolicies={[]}
      initialDiscoveryStrategies={[
        {
          id: 1,
          key: "sitemap",
          label: "Sitemap",
          kind: "native",
          safety_status: "safe",
          active: true,
          created_by: null,
          created_at: "2026-07-27T12:00:00Z",
        },
      ]}
      initialExtractionPolicies={[]}
      initialModels={[]}
      {...overrides}
    />,
  );
}

function activateTab(name: "Discovery" | "Extração") {
  const tab = screen.getByRole("tab", { name });
  fireEvent.mouseDown(tab, { button: 0, ctrlKey: false });
}
