import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CrawlerOverviewDashboard } from "../CrawlerOverviewDashboard";

const emptyOverview = {
  agencies: {
    total: 0,
    lifecycle: { onboarding: 0, active: 0, paused: 0, archived: 0 },
    health: { unknown: 0, healthy: 0, degraded: 0, unavailable: 0 },
  },
  operations: { active: 0, failed: 0 },
  open_circuits: 0,
  quarantined_snapshots: 0,
  active_operations: [],
  recent_failures: [],
  alerts: [],
};

describe("CrawlerOverviewDashboard", () => {
  it("renders the empty operational state", () => {
    render(<CrawlerOverviewDashboard initialOverview={emptyOverview} integrations={[]} workers={[]} />);

    expect(screen.getByRole("heading", { name: /visão geral/i })).toBeInTheDocument();
    expect(screen.getByText(/nenhum worker ativo/i)).toBeInTheDocument();
    expect(screen.getByText(/nenhuma operação ativa/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /snapshots em quarentena/i })).toHaveAttribute("href", "/admin/crawler/quality");
  });

  it("lists active workers and shows only sanitized integration identifiers", () => {
    render(<CrawlerOverviewDashboard
      initialOverview={{
        ...emptyOverview,
        agencies: { ...emptyOverview.agencies, total: 1, health: { ...emptyOverview.agencies.health, degraded: 1 } },
        operations: { active: 1, failed: 2 },
        open_circuits: 1,
        quarantined_snapshots: 1,
      }}
      workers={[
        { id: 1, worker_key: "worker-a", version: "1", capacity: {}, health_state: "healthy", last_heartbeat_at: "2026-01-01T00:00:00Z" },
        { id: 2, worker_key: "worker-b", version: "1", capacity: {}, health_state: "unavailable", last_heartbeat_at: "2026-01-01T00:00:00Z" },
      ]}
      integrations={[{
        key: "google_places",
        label: "Google Places",
        availability: "configured",
        credential_identifier: "…3456",
      }]}
    />);

    expect(screen.getByText("worker-a")).toBeInTheDocument();
    expect(screen.queryByText("worker-b")).not.toBeInTheDocument();
    expect(screen.getByText("…3456")).toBeInTheDocument();
    expect(screen.queryByText(/places-secret/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /testar google places/i })).toBeInTheDocument();
  });
});
