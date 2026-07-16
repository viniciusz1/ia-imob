import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CrawlRun } from "@/types/crawler";

import { ExceptionalPublicationPanel } from "../ExceptionalPublicationPanel";

const run: CrawlRun = {
  id: 9,
  operation_id: 9,
  crawl_agency_id: 1,
  discovery_snapshot_id: 1,
  extraction_profile_id: 1,
  market_data_contract_version_id: 1,
  quality_policy_version_id: 1,
  technical_state: "succeeded",
  result_kind: "full",
  publication_state: "quarantined",
  publishable: false,
  quality_report: {
    id: 4,
    verdict: "blocked",
    blockers: ["stock_drop_above_threshold"],
    warnings: [],
    evidence: { baseline: { normalized_average: 100 }, ratios: { stock_drop: 0.6 } },
    market_data_contract_version_id: 1,
    quality_policy_version_id: 1,
    evaluated_at: "2026-07-15T12:00:00Z",
  },
  exceptional_publication: null,
  counts: { raw: 40, normalized: 40, rejected: 0, errors: 0 },
  error_summary: [],
  published_at: null,
  quarantined_at: "2026-07-15T12:00:00Z",
  started_at: "2026-07-15T11:00:00Z",
  completed_at: "2026-07-15T12:00:00Z",
  created_at: "2026-07-15T11:00:00Z",
};

describe("ExceptionalPublicationPanel", () => {
  it("requires evidence review and a reason before exceptional publication", () => {
    render(<ExceptionalPublicationPanel initialRun={run} />);

    expect(screen.getByText("stock_drop_above_threshold")).toBeInTheDocument();
    expect(screen.getByText(/normalized_average/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /justificativa/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publicar excepcionalmente/i })).toBeDisabled();
  });
});
