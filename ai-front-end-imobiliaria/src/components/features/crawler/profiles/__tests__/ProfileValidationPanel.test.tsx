import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ExtractionProfile } from "@/types/crawler";

import { ProfileValidationPanel } from "../ProfileValidationPanel";

const profile: ExtractionProfile = {
  id: 9,
  crawl_agency_id: 42,
  discovery_snapshot_id: 5,
  market_data_contract_version_id: 1,
  version: 1,
  status: "candidate",
  sample_url: "https://agency.example.com/property/1",
  schemas: {},
  strategies: ["xpath"],
  fields: [],
  parameters: {},
  decided_by: null,
  decided_at: null,
  decision_reason: null,
  activated_by: null,
  activated_at: null,
  created_at: "2026-07-15T12:00:00Z",
  latest_validation_report: {
    id: 4,
    operation_id: 11,
    extraction_profile_id: 9,
    sampled_url_count: 20,
    valid_record_count: 16,
    valid_ratio: 0.8,
    required_field_coverage: { title: 1 },
    blocking_failures: [],
    warnings: ["One normalization warning"],
    eligible: true,
    records: [{
      id: 1,
      url: "https://agency.example.com/property/1",
      raw_data: { title: "Raw title" },
      normalized_data: { title: "Raw title" },
      errors: [],
      field_presence: { title: true },
      is_valid: true,
    }],
    created_at: "2026-07-15T12:30:00Z",
  },
};

describe("ProfileValidationPanel", () => {
  it("shows per-url evidence and allows approval when only alerts remain", () => {
    render(<ProfileValidationPanel agencyLifecycle="onboarding" initialProfile={profile} />);

    expect(screen.getAllByText(/Raw title/)).toHaveLength(2);
    expect(screen.getByText("One normalization warning")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /motivo da decisão/i }), { target: { value: "Evidence reviewed" } });
    expect(screen.getByRole("button", { name: /aprovar perfil/i })).toBeEnabled();
  });

  it("blocks approval when the report has a blocking failure", () => {
    render(
      <ProfileValidationPanel
        agencyLifecycle="onboarding"
        initialProfile={{
          ...profile,
          latest_validation_report: {
            ...profile.latest_validation_report!,
            eligible: false,
            blocking_failures: ["no_valid_records"],
          },
        }}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: /motivo da decisão/i }), { target: { value: "Cannot approve" } });
    expect(screen.getByRole("button", { name: /aprovar perfil/i })).toBeDisabled();
  });

  it("keeps Crawl Agency activation as a second explicit action", () => {
    render(
      <ProfileValidationPanel
        agencyLifecycle="onboarding"
        initialProfile={{ ...profile, status: "active" }}
      />,
    );

    expect(screen.getByRole("button", { name: /ativar crawl agency/i })).toBeEnabled();
  });
});
