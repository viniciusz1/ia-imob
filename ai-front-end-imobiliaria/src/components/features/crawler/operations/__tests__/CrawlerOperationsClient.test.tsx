import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrawlerOperationsClient } from "../CrawlerOperationsClient";

describe("CrawlerOperationsClient", () => {
  it("shows worker observability and operation progress without process controls", () => {
    render(
      <CrawlerOperationsClient
        agencies={[]}
        initialWorkers={[
          {
            id: 1,
            worker_key: "worker-a",
            version: "1.0.0",
            capacity: { concurrency: 1 },
            health_state: "healthy",
            last_heartbeat_at: "2026-07-15T12:00:00Z",
          },
        ]}
        initialOperations={[
          {
            id: 7,
            type: "discovery",
            state: "running",
            crawl_agency_id: 42,
            market_data_contract_version_id: 1,
            retry_of_operation_id: null,
            equivalence_key: "running-plan",
            plan: { base_url: "https://agency.example.com" },
            progress: { stage: "discovery", percentage: 45, processed: 9, total: 20, message: "Scanning", heartbeat_at: "2026-07-15T12:00:00Z" },
            result: null,
            error: null,
            discovery_snapshot_id: null,
            created_at: "2026-07-15T12:00:00Z",
            completed_at: null,
            timeline: [
              { stage: "queue", status: "completed" },
              { stage: "discovery", status: "current" },
            ],
          },
        ]}
      />,
    );

    expect(screen.getByText("worker-a")).toBeInTheDocument();
    expect(screen.getByText(/versão: 1\.0\.0/i)).toBeInTheDocument();
    expect(screen.getByText(/concurrency: 1/i)).toBeInTheDocument();
    expect(screen.getByText(/heartbeat/i)).toBeInTheDocument();
    expect(screen.getByText(/45%/)).toBeInTheDocument();
    expect(screen.getByText("discovery")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /filtrar por tipo/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /iniciar worker|parar worker/i })).not.toBeInTheDocument();
  });

  it("shows an explicit empty queue state", () => {
    render(<CrawlerOperationsClient agencies={[]} initialOperations={[]} initialWorkers={[]} />);
    expect(screen.getByText(/nenhuma operação encontrada/i)).toBeInTheDocument();
  });
});
