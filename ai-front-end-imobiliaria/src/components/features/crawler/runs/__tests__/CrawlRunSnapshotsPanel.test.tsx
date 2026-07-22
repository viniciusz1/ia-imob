import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CrawlRun } from "@/types/crawler";

import { CrawlRunSnapshotsPanel } from "../CrawlRunSnapshotsPanel";

const run = (id: number, state: CrawlRun["publication_state"], blockers: string[] = []): CrawlRun => ({
  id,
  operation_id: id,
  crawl_agency_id: 1,
  discovery_snapshot_id: id,
  extraction_profile_id: 1,
  market_data_contract_version_id: 1,
  quality_policy_version_id: 1,
  technical_state: "succeeded",
  result_kind: "full",
  publication_state: state,
  publishable: state !== "quarantined",
  quality_report: {
    id,
    verdict: state === "quarantined" ? "blocked" : "approved",
    blockers,
    warnings: [],
    evidence: { discovered: 10, normalized: 8 },
    market_data_contract_version_id: 1,
    quality_policy_version_id: 1,
    evaluated_at: "2026-07-15T12:00:00Z",
  },
  exceptional_publication: null,
  counts: { raw: 10, normalized: 8, rejected: 2, errors: 0 },
  error_summary: [],
  published_at: state === "published" ? "2026-07-15T12:00:00Z" : null,
  quarantined_at: state === "quarantined" ? "2026-07-15T12:00:00Z" : null,
  started_at: "2026-07-15T11:00:00Z",
  completed_at: "2026-07-15T12:00:00Z",
  created_at: "2026-07-15T11:00:00Z",
});

describe("CrawlRunSnapshotsPanel", () => {
  it("shows candidate, published and quarantine evidence", () => {
    render(<CrawlRunSnapshotsPanel runs={[run(3, "candidate"), run(2, "quarantined", ["zero_valid_records"]), run(1, "published")]} />);

    expect(screen.getByText("Candidato")).toBeInTheDocument();
    expect(screen.getByText("Publicado")).toBeInTheDocument();
    expect(screen.getByText("Quarentena")).toBeInTheDocument();
    expect(screen.getByText("zero_valid_records")).toBeInTheDocument();
    expect(screen.getAllByText("Contrato v1 · Política v1")).toHaveLength(3);
  });
});
