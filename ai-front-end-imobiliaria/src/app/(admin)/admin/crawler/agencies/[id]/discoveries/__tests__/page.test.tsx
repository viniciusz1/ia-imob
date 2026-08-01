import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  getCrawlAgency,
  getOnboardingExecution,
  listDiscoverySnapshots,
  listMarketDataContracts,
  listOnboardingDiscoverySnapshotCandidates,
} from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type { CrawlAgency, OnboardingDiscoverySnapshotCandidate } from "@/types/crawler";
import { onboardingExecution } from "@/components/features/crawler/agencies/__tests__/onboardingExecutionFixture";

import DiscoveriesPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/crawler/agencies/42/discoveries",
}));

vi.mock("@/services/crawlerService", () => ({
  getCrawlAgency: vi.fn(),
  getOnboardingExecution: vi.fn(),
  listDiscoverySnapshots: vi.fn(),
  listMarketDataContracts: vi.fn(),
  listOnboardingDiscoverySnapshotCandidates: vi.fn(),
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
  created_at: "2026-08-01T12:00:00Z",
  updated_at: "2026-08-01T12:00:00Z",
};

const candidate: OnboardingDiscoverySnapshotCandidate = {
  id: 33,
  operation_id: 78,
  crawl_agency_id: 42,
  url_count: 36,
  content_hash: "snapshot",
  created_at: "2026-08-01T13:44:36Z",
  adoption: {
    eligible: true,
    reason: null,
    sample_url: "https://litoral.example.com/imovel/1",
    age_warning: null,
  },
};

describe("DiscoveriesPage", () => {
  it("carries the Onboarding recovery context into a custom Discovery", async () => {
    useAuthStore.getState().setUser({
      id: 1,
      name: "Operator",
      email: "operator@example.com",
      is_platform_admin: true,
      permissions: ["crawler.view", "crawler.operations.execute"],
    });
    vi.mocked(getCrawlAgency).mockResolvedValue(agency);
    vi.mocked(getOnboardingExecution).mockResolvedValue(onboardingExecution({
      state: "requires_attention",
      current_step: "discovery",
    }));
    vi.mocked(listDiscoverySnapshots).mockResolvedValue([candidate]);
    vi.mocked(listMarketDataContracts).mockResolvedValue([]);
    vi.mocked(listOnboardingDiscoverySnapshotCandidates).mockResolvedValue([candidate]);

    render(await DiscoveriesPage({
      params: Promise.resolve({ id: "42" }),
      searchParams: Promise.resolve({ onboarding_execution_id: "91" }),
    }));

    expect(getOnboardingExecution).toHaveBeenCalledWith(91);
    expect(listOnboardingDiscoverySnapshotCandidates).toHaveBeenCalledWith(91);
    expect(screen.getByText("Continuar Execução de Onboarding #91")).toBeInTheDocument();
  });
});
