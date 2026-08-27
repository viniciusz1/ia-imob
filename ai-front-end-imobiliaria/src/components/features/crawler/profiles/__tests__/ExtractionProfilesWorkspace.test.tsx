import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  CrawlAgency,
  CrawlerOperation,
  DiscoverySnapshot,
  ExtractionProfile,
  MarketDataContract,
} from "@/types/crawler";

import { ExtractionProfilesWorkspace } from "../ExtractionProfilesWorkspace";

vi.mock("@/services/crawlerService", () => ({
  getCrawlerOperation: vi.fn(),
  listExtractionProfiles: vi.fn(),
}));

vi.mock("../ExtractionProfileGenerator", () => ({
  ExtractionProfileGenerator: () => <div data-testid="profile-generator">Formulário de geração</div>,
}));

vi.mock("../ProfileValidationPanel", () => ({
  ProfileValidationPanel: ({
    initialProfile,
    onProfileChange,
  }: {
    initialProfile: ExtractionProfile;
    onProfileChange?: (profile: ExtractionProfile) => void;
  }) => (
    <div>
      <div data-testid="profile-version">Perfil v{initialProfile.version}</div>
      <div data-testid={`profile-status-${initialProfile.id}`}>{initialProfile.status}</div>
      {initialProfile.status === "approved" && (
        <button onClick={() => onProfileChange?.({ ...initialProfile, status: "active" })} type="button">
          Ativar Perfil v{initialProfile.version}
        </button>
      )}
    </div>
  ),
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

describe("ExtractionProfilesWorkspace", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes the next-action band and directs to Discovery from the generator card", () => {
    renderWorkspace({ snapshots: [] });

    expect(screen.queryByText("Próxima ação")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /criar discovery/i })).toHaveAttribute("href", "/admin/crawler/agencies/42/discoveries");
  });

  it("opens generation when Discovery exists without a pending or active profile", () => {
    renderWorkspace();
    expect(screen.getByTestId("profile-generator")).toBeInTheDocument();
    expect(screen.queryByText("Próxima ação")).not.toBeInTheDocument();
  });

  it("labels the versioned list as Perfis de Extração", () => {
    renderWorkspace({ profiles: [profile("approved", true)] });

    expect(screen.getByText("Perfis de Extração")).toBeInTheDocument();
    expect(screen.queryByText("Versões do perfil")).not.toBeInTheDocument();
  });

  it("does not render a separate operation or next-action card", () => {
    renderWorkspace({ operations: [operation()], profiles: [profile("candidate")] });

    expect(screen.queryByText("Próxima ação")).not.toBeInTheDocument();
    expect(screen.queryByText(/operação #55/i)).not.toBeInTheDocument();
  });

  it("updates the selected profile and demotes the previously active version in the list", () => {
    renderWorkspace({
      currentAgency: { ...agency, lifecycle_state: "active" },
      profiles: [
        { ...profile("approved", true), id: 10, version: 2 },
        { ...profile("active", true), id: 9, version: 1 },
      ],
    });

    fireEvent.click(screen.getByRole("button", { name: "Ativar Perfil v2" }));

    expect(screen.getByTestId("profile-status-10")).toHaveTextContent("active");
    expect(screen.getByTestId("profile-status-9")).toHaveTextContent("approved");
  });

  it("orders the history from the newest version", () => {
    renderWorkspace({ profiles: [{ ...profile("rejected", true), id: 8, version: 1 }, { ...profile("candidate", true), id: 9, version: 2 }] });
    expect(screen.getAllByTestId("profile-version").map((item) => item.textContent)).toEqual(["Perfil v2", "Perfil v1"]);
  });
});
