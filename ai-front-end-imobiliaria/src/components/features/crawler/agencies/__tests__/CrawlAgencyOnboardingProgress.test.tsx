import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CrawlAgency, DiscoverySnapshot, ExtractionProfile } from "@/types/crawler";

import { CrawlAgencyOnboardingProgress } from "../CrawlAgencyOnboardingProgress";

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
  operation_id: 7,
  crawl_agency_id: 42,
  url_count: 10,
  content_hash: "abc",
  created_at: "2026-07-15T12:00:00Z",
};

const activeProfile: ExtractionProfile = {
  id: 9,
  crawl_agency_id: 42,
  discovery_snapshot_id: 5,
  market_data_contract_version_id: 1,
  version: 1,
  status: "active",
  sample_url: "https://imoveis.example.com/imovel/1",
  schemas: {},
  strategies: ["xpath"],
  fields: [],
  parameters: {},
  decided_by: 1,
  decided_at: "2026-07-15T13:00:00Z",
  decision_reason: null,
  activated_by: 1,
  activated_at: "2026-07-15T13:00:00Z",
  latest_validation_report: {
    id: 4,
    operation_id: 11,
    extraction_profile_id: 9,
    sampled_url_count: 10,
    valid_record_count: 9,
    valid_ratio: 0.9,
    required_field_coverage: {},
    blocking_failures: [],
    warnings: [],
    eligible: true,
    created_at: "2026-07-15T12:30:00Z",
  },
  created_at: "2026-07-15T12:00:00Z",
};

describe("CrawlAgencyOnboardingProgress", () => {
  it("marks Discovery as the current step for a new Crawl Agency", () => {
    render(<CrawlAgencyOnboardingProgress agency={agency} profiles={[]} snapshots={[]} />);

    expect(screen.getByText("0 de 5 concluídas")).toBeInTheDocument();
    const steps = screen.getAllByRole("listitem");
    expect(within(steps[0]).getByText("Etapa atual")).toBeInTheDocument();
    for (const step of steps.slice(1)) {
      expect(within(step).getByText("Pendente")).toBeInTheDocument();
    }
  });

  it("shows every onboarding step as completed for an active Crawl Agency", () => {
    render(<CrawlAgencyOnboardingProgress agency={{ ...agency, lifecycle_state: "active" }} profiles={[activeProfile]} snapshots={[snapshot]} />);

    expect(screen.getByText("5 de 5 concluídas")).toBeInTheDocument();
    for (const step of screen.getAllByRole("listitem")) {
      expect(within(step).getByText("Concluída")).toBeInTheDocument();
    }
  });
});
