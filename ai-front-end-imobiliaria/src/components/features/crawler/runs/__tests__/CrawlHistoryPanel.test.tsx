import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrawlerOperation, CrawlRun } from "@/types/crawler";

import { CrawlHistoryPanel } from "../CrawlHistoryPanel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/services/crawlerService", () => ({
  getCrawlerOperation: vi.fn().mockImplementation((id: number) =>
    Promise.resolve({
      id,
      type: "profile_validation",
      state: "succeeded",
      crawl_agency_id: 42,
      market_data_contract_version_id: 1,
      retry_of_operation_id: null,
      equivalence_key: null,
      plan: { extraction_profile_id: 2 },
      progress: { stage: "completed", percentage: 100, processed: 10, total: 10, message: null, heartbeat_at: null },
      result: { profile_validation_report_id: 5 },
      error: null,
      discovery_snapshot_id: 1,
      created_at: "2026-07-02T12:00:00Z",
      completed_at: "2026-07-02T12:05:00Z",
    }),
  ),
  getProfileValidationReport: vi.fn().mockResolvedValue({
    id: 5,
    crawl_agency_id: 42,
    extraction_profile_id: 2,
    discovery_snapshot_id: 1,
    sampled_url_count: 10,
    valid_record_count: 10,
    valid_ratio: 1,
    required_field_coverage: { bairro: 1, cidade: 1, tipo_imovel: 1, title: 1, url: 1, valor: 1 },
    blocking_failures: [],
    warnings: [],
    evaluated_at: "2026-07-02T12:05:00Z",
  }),
  getCrawlRun: vi.fn().mockImplementation((id: number) =>
    Promise.resolve({
      id,
      operation_id: 10,
      crawl_agency_id: 42,
      discovery_snapshot_id: 1,
      extraction_profile_id: 1,
      market_data_contract_version_id: 1,
      quality_policy_version_id: 1,
      technical_state: "succeeded",
      result_kind: "full",
      publication_state: "published",
      publishable: true,
      quality_report: null,
      exceptional_publication: null,
      quality_rejection: null,
      counts: { raw: 5, normalized: 5, rejected: 0, errors: 0 },
      error_summary: [],
      started_at: "2026-07-01T12:00:00Z",
      completed_at: "2026-07-01T12:05:00Z",
      published_at: "2026-07-01T12:06:00Z",
      quarantined_at: null,
      created_at: "2026-07-01T12:00:00Z",
    }),
  ),
  listCrawlRunRecords: vi.fn().mockResolvedValue({
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
  }),
  getProfileValidationRecords: vi.fn().mockResolvedValue({
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
  }),
}));

const validation: CrawlerOperation = {
  id: 20,
  type: "profile_validation",
  state: "succeeded",
  crawl_agency_id: 42,
  market_data_contract_version_id: 1,
  retry_of_operation_id: null,
  equivalence_key: null,
  plan: { extraction_profile_id: 2 },
  progress: { stage: "completed", percentage: 100, processed: 10, total: 10, message: null, heartbeat_at: null },
  result: { profile_validation_report_id: 5 },
  error: null,
  discovery_snapshot_id: 1,
  created_at: "2026-07-02T12:00:00Z",
  completed_at: "2026-07-02T12:05:00Z",
};

const productionRun: CrawlRun = {
  id: 9,
  operation_id: 10,
  crawl_agency_id: 42,
  discovery_snapshot_id: 1,
  extraction_profile_id: 1,
  market_data_contract_version_id: 1,
  quality_policy_version_id: 1,
  technical_state: "succeeded",
  result_kind: "full",
  publication_state: "published",
  publishable: true,
  quality_report: null,
  exceptional_publication: null,
  quality_rejection: null,
  counts: { raw: 5, normalized: 5, rejected: 0, errors: 0 },
  error_summary: [],
  started_at: "2026-07-01T12:00:00Z",
  completed_at: "2026-07-01T12:05:00Z",
  published_at: "2026-07-01T12:06:00Z",
  quarantined_at: null,
  created_at: "2026-07-01T12:00:00Z",
};

describe("CrawlHistoryPanel", () => {
  it("unifies validation operations with production runs and filters by type", () => {
    render(<CrawlHistoryPanel agencyId={42} operations={[validation]} runs={[productionRun]} />);

    expect(screen.getAllByRole("button", { name: "Ver execução" })).toHaveLength(2);
    expect(screen.getByText("5 normalizados · Publicado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Validação" }));
    expect(screen.getByText("Resultado da validação disponível")).toBeInTheDocument();
    expect(screen.queryByText("5 normalizados · Publicado")).not.toBeInTheDocument();
  });

  it("opens modal when clicking 'Ver execução'", async () => {
    render(<CrawlHistoryPanel agencyId={42} operations={[validation]} runs={[productionRun]} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const buttons = screen.getAllByRole("button", { name: "Ver execução" });
    fireEvent.click(buttons[0]);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Crawl de Validação")).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Operação #20/).length).toBeGreaterThan(0);

    const link = within(dialog).getByRole("link", { name: "Abrir em página dedicada" });
    expect(link).toHaveAttribute("href", "/admin/crawler/agencies/42/crawls/operations/20");

    fireEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("opens modal for production run when clicking 'Ver execução'", async () => {
    render(<CrawlHistoryPanel agencyId={42} operations={[validation]} runs={[productionRun]} />);

    const buttons = screen.getAllByRole("button", { name: "Ver execução" });
    fireEvent.click(buttons[1]);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Crawl Run #9")).toBeInTheDocument();

    const link = within(dialog).getByRole("link", { name: "Abrir em página dedicada" });
    expect(link).toHaveAttribute("href", "/admin/crawler/runs/9");
  });
});
