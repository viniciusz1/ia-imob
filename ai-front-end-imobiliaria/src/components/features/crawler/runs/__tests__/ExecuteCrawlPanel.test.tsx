import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queueProductionCrawl, queueProfileValidation } from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type {
  CrawlAgency,
  CrawlerOperation,
  DiscoveryPolicyVersion,
  ExtractionProfile,
} from "@/types/crawler";

import { ExecuteCrawlPanel } from "../ExecuteCrawlPanel";

vi.mock("@/services/crawlerService", () => ({
  activateCrawlAgencyDiscoveryPolicy: vi.fn(),
  getCrawlerOperation: vi.fn(),
  queueProductionCrawl: vi.fn(),
  queueProfileValidation: vi.fn(),
}));

const mockedQueueProduction = vi.mocked(queueProductionCrawl);
const mockedQueueValidation = vi.mocked(queueProfileValidation);

const activePolicy: DiscoveryPolicyVersion = {
  id: 21,
  policy_key: "active-policy",
  name: "Discovery ativo",
  version: 2,
  status: "available",
  strategies: ["sitemap", "homepage"],
  configuration: { max_urls: 500 },
  mutable: false,
  model_reference_count: 0,
  active_model_reference_count: 0,
  created_by: 1,
  created_at: "2026-07-15T12:00:00Z",
};

const agency: CrawlAgency = {
  id: 42,
  name: "Imóveis Litoral",
  slug: "imoveis-litoral",
  base_url: "https://litoral.example.com",
  root_domain: "litoral.example.com",
  lifecycle_state: "active",
  health_state: "healthy",
  revalidation_required: false,
  current_published_crawl_run_id: 1,
  active_discovery_policy_version_id: activePolicy.id,
  active_discovery_policy: {
    id: activePolicy.id,
    name: activePolicy.name,
    version: activePolicy.version,
    source: "agency_active",
    strategies: activePolicy.strategies,
    configuration: { ...activePolicy.configuration },
  },
  created_at: "2026-07-15T12:00:00Z",
  updated_at: "2026-07-15T12:00:00Z",
};

function createProfile(id: number, version: number, status: ExtractionProfile["status"]): ExtractionProfile {
  return {
    id,
    crawl_agency_id: 42,
    discovery_snapshot_id: version,
    market_data_contract_version_id: 1,
    version,
    status,
    sample_url: `https://example.com/property/${id}`,
    schemas: {},
    strategies: [],
    fields: [],
    parameters: {},
    decided_by: null,
    decided_at: null,
    decision_reason: null,
    activated_by: null,
    activated_at: null,
    latest_validation_report: null,
    created_at: `2026-07-${String(version).padStart(2, "0")}T12:00:00Z`,
  };
}

const queuedValidationOperation: CrawlerOperation = {
  id: 81,
  type: "profile_validation",
  state: "queued",
  crawl_agency_id: 42,
  market_data_contract_version_id: 1,
  retry_of_operation_id: null,
  equivalence_key: "validation-2",
  plan: { extraction_profile_id: 2 },
  progress: { stage: "queued", percentage: 0, processed: 0, total: null, message: null, heartbeat_at: null },
  result: null,
  error: null,
  discovery_snapshot_id: null,
  created_at: "2026-07-02T12:00:00Z",
  completed_at: null,
};

const queuedProductionOperation: CrawlerOperation = {
  id: 99,
  type: "production_crawl",
  state: "queued",
  crawl_agency_id: 42,
  market_data_contract_version_id: 1,
  retry_of_operation_id: null,
  equivalence_key: null,
  plan: {},
  progress: { stage: "queued", percentage: 0, processed: 0, total: null, message: null, heartbeat_at: null },
  result: null,
  error: null,
  discovery_snapshot_id: null,
  created_at: "2026-07-15T12:00:00Z",
  completed_at: null,
};

describe("ExecuteCrawlPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.getState().setUser({
      id: 1,
      name: "Crawler Operator",
      email: "operator@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "crawler.operations.execute", "crawler.policies.manage"],
    });
    mockedQueueProduction.mockResolvedValue(queuedProductionOperation);
    mockedQueueValidation.mockResolvedValue(queuedValidationOperation);
  });

  it("renders the checkbox and defaults to production crawl when usable profiles exist", async () => {
    render(
      <ExecuteCrawlPanel
        activeOnboarding={null}
        agency={agency}
        discoveryPolicies={[activePolicy]}
        hasActiveQualityPolicy={true}
        initialOperations={[]}
        profiles={[
          createProfile(1, 1, "active"),
          createProfile(2, 2, "candidate"),
        ]}
        snapshots={[{ id: 10, url_count: 50, created_at: "2026-07-15T12:00:00Z" }]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /^crawl de validação$/i });
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("Crawl de Produção")).toBeInTheDocument();
    expect(screen.getByText("Política de Discovery Ativa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rodar Crawl" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rodar Crawl" }));
    await waitFor(() => {
      expect(mockedQueueProduction).toHaveBeenCalledWith({
        crawl_agency_id: 42,
        discovery_mode: "fresh",
        extraction_profile_id: 1,
      });
    });
  });

  it("switches to validation crawl when checking the checkbox and executes validation", async () => {
    render(
      <ExecuteCrawlPanel
        activeOnboarding={null}
        agency={agency}
        discoveryPolicies={[activePolicy]}
        hasActiveQualityPolicy={true}
        initialOperations={[]}
        profiles={[
          createProfile(1, 1, "active"),
          createProfile(2, 2, "candidate"),
        ]}
        snapshots={[]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /^crawl de validação$/i });
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Crawl de Validação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rodar Crawl de Validação" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rodar Crawl de Validação" }));
    await waitFor(() => {
      expect(mockedQueueValidation).toHaveBeenCalledWith(2);
    });

    // Unchecking switches back to production
    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText("Crawl de Produção")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rodar Crawl" })).toBeInTheDocument();
  });

  it("defaults to validation crawl if active onboarding is present with eligible candidate profiles", () => {
    render(
      <ExecuteCrawlPanel
        activeOnboarding={{ id: 9, current_step: "profile_validation", operations: [] }}
        agency={agency}
        discoveryPolicies={[activePolicy]}
        hasActiveQualityPolicy={true}
        initialOperations={[]}
        profiles={[
          createProfile(1, 1, "active"),
          createProfile(2, 2, "candidate"),
        ]}
        snapshots={[]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /^crawl de validação$/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Crawl de Validação")).toBeInTheDocument();
    expect(screen.getByText("Validação integrada ao Onboarding")).toBeInTheDocument();
  });

  it("defaults to validation crawl if only candidate profiles exist and no active/approved profiles", () => {
    render(
      <ExecuteCrawlPanel
        activeOnboarding={null}
        agency={agency}
        discoveryPolicies={[activePolicy]}
        hasActiveQualityPolicy={true}
        initialOperations={[]}
        profiles={[
          createProfile(2, 2, "candidate"),
        ]}
        snapshots={[]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /^crawl de validação$/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Crawl de Validação")).toBeInTheDocument();
  });

  it("respects defaultIsValidation override prop", () => {
    render(
      <ExecuteCrawlPanel
        activeOnboarding={null}
        agency={agency}
        defaultIsValidation={true}
        discoveryPolicies={[activePolicy]}
        hasActiveQualityPolicy={true}
        initialOperations={[]}
        profiles={[
          createProfile(1, 1, "active"),
        ]}
        snapshots={[]}
      />,
    );

    const checkbox = screen.getByRole("checkbox", { name: /^crawl de validação$/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Crawl de Validação")).toBeInTheDocument();
  });
});
