import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrawlAgency, CrawlAgencySchedule } from "@/types/crawler";

import { CrawlAgencyWorkspaceClient } from "../CrawlAgencyWorkspaceClient";
import { onboardingExecution } from "./onboardingExecutionFixture";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/crawler/agencies/42",
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

const schedule: CrawlAgencySchedule = {
  id: null,
  crawl_agency_id: 42,
  inherit_default: true,
  preset: null,
  timezone: null,
  effective_preset: "daily",
  effective_timezone: "America/Sao_Paulo",
  next_run_at: null,
  last_enqueued_at: null,
  discovery_policy: null,
  suspended: false,
  suspension_reason: null,
  circuit: { state: "closed", consecutive_failures: 0 },
};

describe("CrawlAgencyWorkspaceClient", () => {
  it("keeps only the contextual Onboarding summary in the overview", () => {
    const execution = onboardingExecution({
      state: "completed",
      current_step: "quality_gate",
      next_action: null,
      completed_at: "2026-07-28T12:00:00Z",
    });

    render(
      <CrawlAgencyWorkspaceClient
        agency={agency}
        discoveryPolicies={[]}
        discoveryStrategies={[]}
        executions={[execution]}
        extractionPolicies={[]}
        initialOperations={[]}
        models={[]}
        onboardingPlan={null}
        profiles={[]}
        runs={[]}
        schedule={schedule}
        snapshots={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Onboarding concluído" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir Onboarding" })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/42/onboarding",
    );
    expect(screen.queryByRole("list", { name: "Timeline da Execução de Onboarding" })).not.toBeInTheDocument();
  });
});
