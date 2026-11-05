import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CrawlerOperation, CrawlRun } from "@/types/crawler";

import { CrawlExecutionModal } from "../CrawlExecutionModal";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => true,
}));

vi.mock("@/services/crawlerService", () => ({
  getCrawlerOperation: vi.fn().mockImplementation((id: number) =>
    Promise.resolve({
      id,
      type: "profile_validation",
      state: "succeeded",
      crawl_agency_id: 127,
      market_data_contract_version_id: 1,
      retry_of_operation_id: null,
      equivalence_key: null,
      plan: { extraction_profile_id: 2 },
      progress: { stage: "completed", percentage: 100, processed: 10, total: 10, message: null, heartbeat_at: null },
      result: { profile_validation_report_id: 5 },
      error: null,
      discovery_snapshot_id: 1,
      created_at: "2026-11-05T06:57:00Z",
      completed_at: "2026-11-05T06:58:00Z",
    }),
  ),
  getProfileValidationReport: vi.fn().mockResolvedValue({
    id: 5,
    crawl_agency_id: 127,
    extraction_profile_id: 2,
    discovery_snapshot_id: 1,
    sampled_url_count: 10,
    valid_record_count: 10,
    valid_ratio: 1,
    required_field_coverage: { bairro: 1, cidade: 1, tipo_imovel: 1, title: 1, url: 1, valor: 1 },
    blocking_failures: [],
    warnings: [],
    evaluated_at: "2026-11-05T06:58:00Z",
  }),
  getCrawlRun: vi.fn().mockImplementation((id: number) =>
    Promise.resolve({
      id,
      operation_id: 528,
      crawl_agency_id: 127,
      discovery_snapshot_id: 1,
      extraction_profile_id: 2,
      market_data_contract_version_id: 1,
      quality_policy_version_id: 1,
      technical_state: "succeeded",
      result_kind: "full",
      publication_state: "quarantined",
      publishable: true,
      quality_report: {
        id: 10,
        verdict: "blocked",
        blockers: ["Preço muito discrepante"],
        warnings: [],
        evidence: {},
        market_data_contract_version_id: 1,
        quality_policy_version_id: 1,
        evaluated_at: "2026-11-05T07:00:00Z",
      },
      exceptional_publication: null,
      quality_rejection: null,
      counts: { raw: 8, normalized: 8, rejected: 0, errors: 0 },
      error_summary: [],
      started_at: "2026-11-05T06:59:00Z",
      completed_at: "2026-11-05T07:00:00Z",
      published_at: null,
      quarantined_at: "2026-11-05T07:00:00Z",
      created_at: "2026-11-05T06:59:00Z",
    }),
  ),
  listCrawlRunRecords: vi.fn().mockResolvedValue({
    data: [
      {
        id: 1,
        url: "https://example.com/imovel-1",
        bairro: "Centro",
        cidade: "Jaraguá do Sul",
        valor: 500000,
        listing_state: "new",
        absence_count: 0,
      },
    ],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
  }),
  getProfileValidationRecords: vi.fn().mockResolvedValue({
    data: [],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
  }),
}));

const mockOperation: CrawlerOperation = {
  id: 527,
  type: "profile_validation",
  state: "succeeded",
  crawl_agency_id: 127,
  market_data_contract_version_id: 1,
  retry_of_operation_id: null,
  equivalence_key: null,
  plan: { extraction_profile_id: 2 },
  progress: { stage: "completed", percentage: 100, processed: 10, total: 10, message: null, heartbeat_at: null },
  result: { profile_validation_report_id: 5 },
  error: null,
  discovery_snapshot_id: 1,
  created_at: "2026-11-05T06:57:00Z",
  completed_at: "2026-11-05T06:58:00Z",
};

const mockRun: CrawlRun = {
  id: 528,
  operation_id: 528,
  crawl_agency_id: 127,
  discovery_snapshot_id: 1,
  extraction_profile_id: 2,
  market_data_contract_version_id: 1,
  quality_policy_version_id: 1,
  technical_state: "succeeded",
  result_kind: "full",
  publication_state: "quarantined",
  publishable: true,
  quality_report: {
    id: 10,
    verdict: "blocked",
    blockers: ["Preço muito discrepante"],
    warnings: [],
    evidence: {},
    market_data_contract_version_id: 1,
    quality_policy_version_id: 1,
    evaluated_at: "2026-11-05T07:00:00Z",
  },
  exceptional_publication: null,
  quality_rejection: null,
  counts: { raw: 8, normalized: 8, rejected: 0, errors: 0 },
  error_summary: [],
  started_at: "2026-11-05T06:59:00Z",
  completed_at: "2026-11-05T07:00:00Z",
  published_at: null,
  quarantined_at: "2026-11-05T07:00:00Z",
  created_at: "2026-11-05T06:59:00Z",
};

describe("CrawlExecutionModal", () => {
  it("renders validation crawl details and validation report", async () => {
    const onOpenChange = vi.fn();
    render(
      <CrawlExecutionModal
        agencyId={127}
        onOpenChange={onOpenChange}
        open={true}
        operation={mockOperation}
        run={null}
      />,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Crawl de Validação")).toBeInTheDocument();
    expect(await screen.findByText("Resultado da validação")).toBeInTheDocument();
    expect(screen.getByText("Dentro da recomendação")).toBeInTheDocument();
    expect(screen.getByText("10/10 · 100%")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Abrir em página dedicada" });
    expect(link).toHaveAttribute("href", "/admin/crawler/agencies/127/crawls/operations/527");

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders production run details with quality panel and records table", async () => {
    render(
      <CrawlExecutionModal
        agencyId={127}
        onOpenChange={vi.fn()}
        open={true}
        operation={null}
        run={mockRun}
      />,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Crawl Run #528")).toBeInTheDocument();
    expect(await screen.findByText("Evidências de qualidade")).toBeInTheDocument();
    expect(screen.getAllByText("Preço muito discrepante").length).toBeGreaterThan(0);
    expect(screen.getByText("Dados persistidos")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: "Abrir em página dedicada" });
    expect(link).toHaveAttribute("href", "/admin/crawler/runs/528");
  });
});
