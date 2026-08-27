import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CrawlRun } from "@/types/crawler";

import { CrawlAgencyQualityPanel } from "../CrawlAgencyQualityPanel";

function run(id: number, publicationState: CrawlRun["publication_state"]): CrawlRun {
  return {
    id, operation_id: id, crawl_agency_id: 42, discovery_snapshot_id: 1, extraction_profile_id: 1,
    market_data_contract_version_id: 1, quality_policy_version_id: 3, technical_state: "succeeded", result_kind: "full",
    publication_state: publicationState, publishable: publicationState === "published", quality_report: null, exceptional_publication: null,
    counts: { raw: 10, normalized: 8, rejected: 2, errors: 0 }, error_summary: [],
    started_at: "2026-07-01T11:00:00Z", completed_at: "2026-07-01T12:00:00Z",
    published_at: publicationState === "published" ? "2026-07-01T12:00:00Z" : null,
    quarantined_at: publicationState === "quarantined" ? "2026-07-01T12:00:00Z" : null,
    created_at: "2026-07-01T11:00:00Z",
  };
}

describe("CrawlAgencyQualityPanel", () => {
  it("prioritizes pending and quarantined snapshots before the current publication", () => {
    render(<CrawlAgencyQualityPanel currentPublishedRunId={1} runs={[run(3, "candidate"), run(2, "quarantined"), run(1, "published")]} />);

    expect(screen.getByRole("heading", { name: "Requer ação" })).toBeInTheDocument();
    expect(screen.getAllByText("Avaliação pendente")).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "Revisar evidências" })[0]).toHaveAttribute("href", "/admin/crawler/runs/2");
    expect(screen.getByRole("heading", { name: "Snapshot Publicado atual" })).toBeInTheDocument();
  });
});
