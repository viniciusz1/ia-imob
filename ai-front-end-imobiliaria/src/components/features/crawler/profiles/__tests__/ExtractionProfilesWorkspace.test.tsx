import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  activateCrawlAgency,
  activateExtractionProfile,
  queueProfileValidation,
} from "@/services/crawlerService";
import type {
  CrawlAgency,
  CrawlerOperation,
  DiscoverySnapshot,
  ExtractionProfile,
  MarketDataContract,
} from "@/types/crawler";

import { ExtractionProfilesWorkspace } from "../ExtractionProfilesWorkspace";

vi.mock("@/services/crawlerService", () => ({
  activateCrawlAgency: vi.fn(),
  activateExtractionProfile: vi.fn(),
  getCrawlerOperation: vi.fn(),
  listExtractionProfiles: vi.fn(),
  queueProfileValidation: vi.fn(),
}));

vi.mock("../ExtractionProfileGenerator", () => ({
  ExtractionProfileGenerator: () => <div data-testid="profile-generator">Formulário de geração</div>,
}));

vi.mock("../ProfileValidationPanel", () => ({
  ProfileValidationPanel: ({ initialProfile }: { initialProfile: ExtractionProfile }) => <div data-testid="profile-version">Perfil v{initialProfile.version}</div>,
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

const snapshot: DiscoverySnapshot = {
  id: 5,
  crawl_agency_id: 42,
  operation_id: 7,
  url_count: 10,
  content_hash: "abc",
  created_at: "2026-07-15T12:00:00Z",
};

const contract: MarketDataContract = {
  id: 1,
  version: 1,
  status: "active",
  fields: [],
  compatibility: "additive_optional",
  affected_agencies: [],
  created_by: 1,
  activated_by: 1,
  activated_at: "2026-07-15T12:00:00Z",
  created_at: "2026-07-15T12:00:00Z",
};

function profile(status: ExtractionProfile["status"], withReport = false): ExtractionProfile {
  return {
    id: 9,
    crawl_agency_id: 42,
    discovery_snapshot_id: 5,
    market_data_contract_version_id: 1,
    version: 1,
    status,
    sample_url: "https://imoveis.example.com/imovel/1",
    schemas: {},
    strategies: ["xpath"],
    fields: [],
    parameters: {},
    decided_by: null,
    decided_at: null,
    decision_reason: null,
    activated_by: null,
    activated_at: null,
    latest_validation_report: withReport ? {
      id: 4,
      operation_id: 11,
      extraction_profile_id: 9,
      sampled_url_count: 10,
      valid_record_count: 8,
      valid_ratio: 0.8,
      required_field_coverage: {},
      blocking_failures: [],
      warnings: [],
      eligible: true,
      created_at: "2026-07-15T12:30:00Z",
    } : null,
    created_at: "2026-07-15T12:00:00Z",
  };
}

function operation(): CrawlerOperation {
  return {
    id: 55,
    type: "profile_validation",
    state: "running",
    crawl_agency_id: 42,
    market_data_contract_version_id: 1,
    retry_of_operation_id: null,
    equivalence_key: "validation-9",
    plan: { extraction_profile_id: 9 },
    progress: { stage: "profile_validation", percentage: 35, processed: 7, total: 20, message: "Validando URLs", heartbeat_at: null },
    result: null,
    error: null,
    discovery_snapshot_id: null,
    created_at: "2026-07-15T12:35:00Z",
    completed_at: null,
  };
}

function renderWorkspace(options: {
  currentAgency?: CrawlAgency;
  operations?: CrawlerOperation[];
  profiles?: ExtractionProfile[];
  snapshots?: DiscoverySnapshot[];
} = {}) {
  return render(
    <ExtractionProfilesWorkspace
      agency={options.currentAgency ?? agency}
      contracts={[contract]}
      initialOperations={options.operations ?? []}
      initialProfiles={options.profiles ?? []}
      snapshots={options.snapshots ?? [snapshot]}
    />,
  );
}

function expectOnePrimaryAction(name: RegExp) {
  expect(screen.getByRole("button", { name })).toHaveAttribute("data-primary-action", "true");
  expect(document.querySelectorAll('[data-primary-action="true"]')).toHaveLength(1);
}

describe("ExtractionProfilesWorkspace next action", () => {
  beforeEach(() => vi.clearAllMocks());

  it("directs to Discovery when the prerequisite is missing", () => {
    renderWorkspace({ snapshots: [] });
    expect(screen.getByText(/precisa de um snapshot de discovery/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /criar discovery/i })).toHaveAttribute("data-primary-action", "true");
    expect(document.querySelectorAll('[data-primary-action="true"]')).toHaveLength(1);
  });

  it("opens generation when Discovery exists without a pending or active profile", () => {
    renderWorkspace();
    expectOnePrimaryAction(/preparar geração/i);
    expect(screen.queryByTestId("profile-generator")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /preparar geração/i }));
    expect(screen.getByTestId("profile-generator")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-primary-action="true"]')).toHaveLength(0);
  });

  it("queues validation for a candidate without a report", async () => {
    vi.mocked(queueProfileValidation).mockResolvedValue({ ...operation(), state: "queued" });
    renderWorkspace({ profiles: [profile("candidate")] });
    expectOnePrimaryAction(/rodar crawl de validação/i);
    fireEvent.click(screen.getByRole("button", { name: /rodar crawl de validação/i }));
    await waitFor(() => expect(queueProfileValidation).toHaveBeenCalledWith(9));
    expect(await screen.findByText(/operação #55/i)).toBeInTheDocument();
  });

  it("opens the decision as the only primary action when a report exists", () => {
    renderWorkspace({ profiles: [profile("candidate", true)] });
    expectOnePrimaryAction(/registrar decisão/i);
    fireEvent.click(screen.getByRole("button", { name: /registrar decisão/i }));
    expect(document.querySelectorAll('[data-primary-action="true"]')).toHaveLength(0);
    expect(screen.getByText(/registre a aprovação ou rejeição no histórico/i)).toBeInTheDocument();
  });

  it("activates an approved profile", async () => {
    vi.mocked(activateExtractionProfile).mockResolvedValue(profile("active", true));
    renderWorkspace({ profiles: [profile("approved", true)] });
    expectOnePrimaryAction(/ativar perfil de extração/i);
    fireEvent.click(screen.getByRole("button", { name: /ativar perfil de extração/i }));
    await waitFor(() => expect(activateExtractionProfile).toHaveBeenCalledWith(9));
  });

  it("activates an onboarding agency after its profile is active", async () => {
    vi.mocked(activateCrawlAgency).mockResolvedValue({ ...agency, lifecycle_state: "active" });
    renderWorkspace({ profiles: [profile("active", true)] });
    expectOnePrimaryAction(/ativar crawl agency/i);
    fireEvent.click(screen.getByRole("button", { name: /ativar crawl agency/i }));
    await waitFor(() => expect(activateCrawlAgency).toHaveBeenCalledWith(42));
  });

  it("shows readiness without inventing a CTA when no human action is pending", () => {
    renderWorkspace({ currentAgency: { ...agency, lifecycle_state: "active" }, profiles: [profile("active", true)] });
    expect(screen.getByText(/nenhuma ação humana pendente/i)).toBeInTheDocument();
    expect(document.querySelectorAll('[data-primary-action="true"]')).toHaveLength(0);
  });

  it("does not discard an active profile when a newer rejected version exists", () => {
    renderWorkspace({
      currentAgency: { ...agency, lifecycle_state: "active" },
      profiles: [{ ...profile("rejected", true), id: 10, version: 2 }, profile("active", true)],
    });

    expect(screen.getByText(/nenhuma ação humana pendente/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /preparar geração/i })).not.toBeInTheDocument();
  });

  it("replaces duplicate actions with active operation tracking", () => {
    renderWorkspace({ operations: [operation()], profiles: [profile("candidate")] });
    expect(screen.getByText(/operação #55/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir na fila global/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /rodar crawl de validação/i })).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-primary-action="true"]')).toHaveLength(0);
  });

  it("orders the history from the newest version", () => {
    renderWorkspace({ profiles: [{ ...profile("rejected", true), id: 8, version: 1 }, { ...profile("candidate", true), id: 9, version: 2 }] });
    expect(screen.getAllByTestId("profile-version").map((item) => item.textContent)).toEqual(["Perfil v2", "Perfil v1"]);
  });
});
