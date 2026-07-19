import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queueDiscoveryOperation } from "@/services/crawlerService";

import { DiscoveryGenerator } from "../DiscoveryGenerator";

vi.mock("@/services/crawlerService", () => ({
  queueDiscoveryOperation: vi.fn(),
}));

const mockedQueueDiscovery = vi.mocked(queueDiscoveryOperation);

describe("DiscoveryGenerator", () => {
  beforeEach(() => {
    mockedQueueDiscovery.mockResolvedValue({
      id: 12,
      type: "discovery",
      state: "queued",
      crawl_agency_id: 42,
      market_data_contract_version_id: 2,
      retry_of_operation_id: null,
      equivalence_key: null,
      plan: {},
      progress: { stage: "queued", percentage: 0, processed: 0, total: null, message: null, heartbeat_at: null },
      result: null,
      error: null,
      discovery_snapshot_id: null,
      created_at: "2026-07-19T12:00:00Z",
      completed_at: null,
    });
  });

  it("queues discovery for the current Crawl Agency", async () => {
    render(
      <DiscoveryGenerator
        agencyId={42}
        contracts={[{
          id: 2,
          version: 2,
          status: "active",
          fields: [],
          compatibility: "additive_optional",
          affected_agencies: [],
          created_by: 1,
          activated_by: 1,
          activated_at: "2026-07-19T12:00:00Z",
          created_at: "2026-07-19T12:00:00Z",
        }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /enfileirar discovery/i }));

    await waitFor(() => expect(mockedQueueDiscovery).toHaveBeenCalledWith(42, 2));
  });
});
