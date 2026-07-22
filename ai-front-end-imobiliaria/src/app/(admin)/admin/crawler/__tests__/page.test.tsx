import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CrawlerOverviewPage from "../page";

vi.mock("@/services/crawlerService", () => ({
  getCrawlerOverview: vi.fn().mockResolvedValue({
    agencies: { total: 0, lifecycle: { onboarding: 0, active: 0, paused: 0, archived: 0 }, health: { unknown: 0, healthy: 0, degraded: 0, unavailable: 0 } },
    operations: { active: 0, failed: 0 },
    open_circuits: 0,
    quarantined_snapshots: 0,
    active_operations: [],
    recent_failures: [],
    alerts: [],
  }),
  listCrawlerIntegrations: vi.fn().mockResolvedValue([]),
  testCrawlerIntegration: vi.fn(),
}));

describe("CrawlerOverviewPage", () => {
  it("presents the crawler operations entry points", async () => {
    render(await CrawlerOverviewPage());

    expect(
      screen.getByRole("heading", { name: /visão geral/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^crawl agencies$/i)).toBeInTheDocument();
  });
});
