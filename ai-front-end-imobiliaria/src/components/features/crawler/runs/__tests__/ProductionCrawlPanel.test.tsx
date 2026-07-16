import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queueProductionCrawl } from "@/services/crawlerService";

import { ProductionCrawlPanel } from "../ProductionCrawlPanel";

vi.mock("@/services/crawlerService", () => ({
  queueProductionCrawl: vi.fn(),
}));

const mockedQueue = vi.mocked(queueProductionCrawl);

describe("ProductionCrawlPanel", () => {
  beforeEach(() => {
    mockedQueue.mockResolvedValue({
      id: 12,
      type: "production_crawl",
      state: "queued",
      crawl_agency_id: 42,
      market_data_contract_version_id: 1,
      retry_of_operation_id: null,
      equivalence_key: null,
      plan: {},
      progress: { stage: "queued", percentage: 0, processed: 0, total: null, message: null, heartbeat_at: null },
      result: null,
      error: null,
      discovery_snapshot_id: null,
      created_at: "2026-07-15T12:00:00Z",
      completed_at: null,
    });
  });

  it("defaults to fresh discovery and lets the operator pin a historical discovery and approved profile", async () => {
    render(
      <ProductionCrawlPanel
        agencyId={42}
        profiles={[
          { id: 7, version: 1, status: "active", sample_url: "https://example.com/1" },
          { id: 8, version: 2, status: "approved", sample_url: "https://example.com/2" },
        ]}
        snapshots={[{ id: 5, url_count: 30, created_at: "2026-07-15T12:00:00Z" }]}
      />,
    );

    expect(screen.getByRole("combobox", { name: /discovery do crawl/i })).toHaveValue("fresh");
    fireEvent.change(screen.getByRole("combobox", { name: /discovery do crawl/i }), { target: { value: "5" } });
    fireEvent.change(screen.getByRole("combobox", { name: /perfil de extração/i }), { target: { value: "8" } });
    fireEvent.click(screen.getByRole("button", { name: /rodar crawl/i }));

    await waitFor(() => expect(mockedQueue).toHaveBeenCalledWith({
      crawl_agency_id: 42,
      discovery_mode: "existing",
      discovery_snapshot_id: 5,
      extraction_profile_id: 8,
    }));
  });
});
