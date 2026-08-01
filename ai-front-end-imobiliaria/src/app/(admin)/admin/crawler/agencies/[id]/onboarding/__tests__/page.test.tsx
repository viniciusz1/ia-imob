import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { getCrawlAgency, listOnboardingExecutions } from "@/services/crawlerService";
import type { CrawlAgency } from "@/types/crawler";

import CrawlAgencyOnboardingPage from "../page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/crawler/agencies/42/onboarding",
}));

vi.mock("@/services/crawlerService", () => ({
  getCrawlAgency: vi.fn(),
  listOnboardingExecutions: vi.fn(),
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

describe("CrawlAgencyOnboardingPage", () => {
  it("loads the agency and its ordered executions for the dedicated area", async () => {
    vi.mocked(getCrawlAgency).mockResolvedValue(agency);
    vi.mocked(listOnboardingExecutions).mockResolvedValue([]);

    render(await CrawlAgencyOnboardingPage({ params: Promise.resolve({ id: "42" }) }));

    expect(getCrawlAgency).toHaveBeenCalledWith(42);
    expect(listOnboardingExecutions).toHaveBeenCalledWith(42);
    expect(screen.getByRole("heading", { name: "Onboarding" })).toBeInTheDocument();
  });
});
