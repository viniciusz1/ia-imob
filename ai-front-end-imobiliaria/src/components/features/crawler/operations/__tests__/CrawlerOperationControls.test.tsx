import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { CrawlerOperation } from "@/types/crawler";

import { CrawlerOperationsClient } from "../CrawlerOperationsClient";

const failed = (id: number): CrawlerOperation => ({
  id,
  type: "production_crawl",
  state: "failed",
  crawl_agency_id: 42,
  market_data_contract_version_id: 1,
  retry_of_operation_id: null,
  equivalence_key: "same-plan",
  plan: {},
  progress: { stage: "failed", percentage: 50, processed: 10, total: 20, message: null, heartbeat_at: null },
  result: null,
  error: { code: "timeout", message: "timed out" },
  discovery_snapshot_id: null,
  created_at: "2026-07-15T12:00:00Z",
  completed_at: "2026-07-15T12:10:00Z",
  equivalent_failure_count: 2,
});

describe("Crawler operation controls", () => {
  it("groups repeated equivalent failures and exposes individual and batch retry", () => {
    render(<CrawlerOperationsClient agencies={[]} contracts={[]} initialOperations={[failed(1), failed(2)]} initialWorkers={[]} />);

    expect(screen.getByRole("heading", { name: "2 falhas equivalentes" })).toBeInTheDocument();
    expect(screen.getAllByText(/#1 · production_crawl|#2 · production_crawl/)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Retentar" })).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Retentar selecionadas" })).toBeDisabled();
  });
});
