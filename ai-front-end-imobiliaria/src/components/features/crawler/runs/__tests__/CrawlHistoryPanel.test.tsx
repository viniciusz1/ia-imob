import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CrawlerOperation, CrawlRun } from "@/types/crawler";

import { CrawlHistoryPanel } from "../CrawlHistoryPanel";

const validation: CrawlerOperation = {
  id: 20, type: "profile_validation", state: "succeeded", crawl_agency_id: 42,
  market_data_contract_version_id: 1, retry_of_operation_id: null, equivalence_key: null,
  plan: { extraction_profile_id: 2 },
  progress: { stage: "completed", percentage: 100, processed: 10, total: 10, message: null, heartbeat_at: null },
  result: { profile_validation_report_id: 5 }, error: null, discovery_snapshot_id: 1,
  created_at: "2026-07-02T12:00:00Z", completed_at: "2026-07-02T12:05:00Z",
};

const productionRun: CrawlRun = {
  id: 9, operation_id: 10, crawl_agency_id: 42, discovery_snapshot_id: 1, extraction_profile_id: 1,
  market_data_contract_version_id: 1, quality_policy_version_id: 1, technical_state: "succeeded", result_kind: "full",
  publication_state: "published", publishable: true, quality_report: null, exceptional_publication: null,
  counts: { raw: 5, normalized: 5, rejected: 0, errors: 0 }, error_summary: [],
  started_at: "2026-07-01T12:00:00Z", completed_at: "2026-07-01T12:05:00Z", published_at: "2026-07-01T12:06:00Z", quarantined_at: null, created_at: "2026-07-01T12:00:00Z",
};

describe("CrawlHistoryPanel", () => {
  it("unifies validation operations with production runs and filters by type", () => {
    render(<CrawlHistoryPanel agencyId={42} operations={[validation]} runs={[productionRun]} />);

    expect(screen.getAllByRole("link", { name: "Ver execução", exact: true }).some((link) => link.getAttribute("href") === "/admin/crawler/agencies/42/crawls/operations/20")).toBe(true);
    expect(screen.getByText("5 normalizados · Publicado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Validação" }));
    expect(screen.getByText("Resultado da validação disponível")).toBeInTheDocument();
    expect(screen.queryByText("5 normalizados · Publicado")).not.toBeInTheDocument();
  });
});
