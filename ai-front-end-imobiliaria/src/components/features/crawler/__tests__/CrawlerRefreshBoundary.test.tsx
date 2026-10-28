import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CrawlerRefreshBoundary,
  shouldAutoRefreshCrawlerPath,
} from "../CrawlerRefreshBoundary";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("CrawlerRefreshBoundary", () => {
  const mockedUsePathname = vi.mocked(usePathname);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("identifies which crawler paths should and should not auto-refresh", () => {
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler")).toBe(true);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/agencies")).toBe(true);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/queue")).toBe(true);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/prospects")).toBe(true);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/quality")).toBe(true);

    // Specific agency pages should NOT auto-refresh via router.refresh()
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/agencies/42")).toBe(false);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/agencies/42/onboarding")).toBe(false);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/agencies/42/discoveries")).toBe(false);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/agencies/new")).toBe(false);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/batches")).toBe(false);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/settings")).toBe(false);
    expect(shouldAutoRefreshCrawlerPath("/admin/crawler/runs/12")).toBe(false);
  });

  it("renders CrawlerAutoRefresh on matching paths and null on excluded paths", () => {
    mockedUsePathname.mockReturnValue("/admin/crawler");
    const { unmount } = render(<CrawlerRefreshBoundary />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();

    mockedUsePathname.mockReturnValue("/admin/crawler/agencies/10/onboarding");
    render(<CrawlerRefreshBoundary />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
