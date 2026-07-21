import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { evaluateCrawlRunQuality } from "@/services/crawlerService";
import type { CrawlRun } from "@/types/crawler";

import { QualityEvaluationPanel } from "../QualityEvaluationPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

vi.mock("@/services/crawlerService", () => ({
  evaluateCrawlRunQuality: vi.fn(),
}));

const mockedEvaluate = vi.mocked(evaluateCrawlRunQuality);

const candidate: CrawlRun = {
  id: 2,
  operation_id: 2,
  crawl_agency_id: 5,
  discovery_snapshot_id: 1,
  extraction_profile_id: 1,
  market_data_contract_version_id: 2,
  quality_policy_version_id: 1,
  technical_state: "succeeded",
  result_kind: "full",
  publication_state: "candidate",
  publishable: true,
  quality_report: null,
  exceptional_publication: null,
  counts: { raw: 500, normalized: 117, rejected: 383, errors: 0 },
  error_summary: [],
  published_at: null,
  quarantined_at: null,
  started_at: "2026-07-21T10:00:00Z",
  completed_at: "2026-07-21T10:10:00Z",
  created_at: "2026-07-21T10:00:00Z",
};

describe("QualityEvaluationPanel", () => {
  beforeEach(() => {
    mockedEvaluate.mockReset();
  });

  it("lets the operator evaluate a completed candidate immediately", async () => {
    mockedEvaluate.mockResolvedValue({
      ...candidate,
      publication_state: "quarantined",
      publishable: false,
      quarantined_at: "2026-07-21T10:15:00Z",
      quality_report: {
        id: 1,
        verdict: "blocked",
        blockers: ["rejection_ratio_above_threshold"],
        warnings: [],
        evidence: {},
        market_data_contract_version_id: 2,
        quality_policy_version_id: 1,
        evaluated_at: "2026-07-21T10:15:00Z",
      },
    });

    render(<QualityEvaluationPanel initialRun={candidate} />);
    fireEvent.click(screen.getByRole("button", { name: "Avaliar qualidade agora" }));

    await waitFor(() => expect(mockedEvaluate).toHaveBeenCalledWith(2));
    expect(await screen.findByText("rejection_ratio_above_threshold")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Avaliar qualidade agora" })).not.toBeInTheDocument();
  });

  it("does not offer manual evaluation before the crawl finishes", () => {
    render(<QualityEvaluationPanel initialRun={{ ...candidate, completed_at: null, technical_state: "running" }} />);

    expect(screen.queryByRole("button", { name: "Avaliar qualidade agora" })).not.toBeInTheDocument();
  });
});
