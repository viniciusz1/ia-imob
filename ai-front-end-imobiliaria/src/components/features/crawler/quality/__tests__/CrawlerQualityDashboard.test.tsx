import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CrawlRun } from "@/types/crawler";

import { CrawlerQualityDashboard } from "../CrawlerQualityDashboard";

function crawlRun(overrides: Partial<CrawlRun>): CrawlRun {
  return {
    id: 42,
    operation_id: 100,
    crawl_agency_id: 7,
    discovery_snapshot_id: 10,
    extraction_profile_id: 11,
    market_data_contract_version_id: 3,
    quality_policy_version_id: 4,
    technical_state: "succeeded",
    result_kind: "full",
    publication_state: "quarantined",
    publishable: false,
    quality_report: {
      id: 20,
      verdict: "blocked",
      blockers: ["stock_drop_above_threshold"],
      warnings: [],
      evidence: { normalized: 20, baseline: 100 },
      market_data_contract_version_id: 3,
      quality_policy_version_id: 4,
      evaluated_at: "2026-07-17T12:00:00Z",
    },
    exceptional_publication: null,
    counts: { raw: 100, normalized: 20, rejected: 2, errors: 1 },
    error_summary: [],
    started_at: "2026-07-17T11:00:00Z",
    completed_at: "2026-07-17T12:00:00Z",
    published_at: null,
    quarantined_at: "2026-07-17T12:00:00Z",
    created_at: "2026-07-17T11:00:00Z",
    ...overrides,
  };
}

describe("CrawlerQualityDashboard", () => {
  it("consolidates quarantined snapshots and exceptional publication history", () => {
    render(<CrawlerQualityDashboard runs={[
      crawlRun({}),
      crawlRun({
        id: 41,
        publication_state: "published",
        publishable: true,
        exceptional_publication: {
          published_by: 5,
          reason: "Inventory confirmed directly with the agency.",
          published_at: "2026-07-17T13:00:00Z",
        },
        published_at: "2026-07-17T13:00:00Z",
        quarantined_at: "2026-07-17T12:30:00Z",
      }),
    ]} />);

    expect(screen.getByRole("heading", { name: "Qualidade" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Snapshots em quarentena" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revisar snapshot #42" })).toHaveAttribute("href", "/admin/crawler/runs/42");
    expect(screen.getAllByText("stock_drop_above_threshold")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Publicações excepcionais" })).toBeInTheDocument();
    expect(screen.getByText(/inventory confirmed directly with the agency/i)).toBeInTheDocument();
  });

  it("shows explicit empty states", () => {
    render(<CrawlerQualityDashboard runs={[]} />);

    expect(screen.getByText("Nenhum snapshot em quarentena.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma publicação excepcional registrada.")).toBeInTheDocument();
  });
});
