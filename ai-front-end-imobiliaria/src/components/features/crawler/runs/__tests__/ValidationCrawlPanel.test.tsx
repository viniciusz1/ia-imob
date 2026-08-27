import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { queueProfileValidation } from "@/services/crawlerService";
import { useAuthStore } from "@/store/useAuthStore";
import type { CrawlerOperation, ExtractionProfile } from "@/types/crawler";

import { ValidationCrawlPanel } from "../ValidationCrawlPanel";

vi.mock("@/services/crawlerService", () => ({
  getCrawlerOperation: vi.fn(),
  queueProfileValidation: vi.fn(),
}));

function profile(id: number, version: number, status: ExtractionProfile["status"]): ExtractionProfile {
  return {
    id,
    crawl_agency_id: 42,
    discovery_snapshot_id: version,
    market_data_contract_version_id: 1,
    version,
    status,
    sample_url: "https://example.com/property/1",
    schemas: {}, strategies: [], fields: [], parameters: {},
    decided_by: null, decided_at: null, decision_reason: null,
    activated_by: null, activated_at: null,
    latest_validation_report: null,
    created_at: `2026-07-${String(version).padStart(2, "0")}T12:00:00Z`,
  };
}

const queuedOperation: CrawlerOperation = {
  id: 81, type: "profile_validation", state: "queued", crawl_agency_id: 42,
  market_data_contract_version_id: 1, retry_of_operation_id: null, equivalence_key: "validation-2",
  plan: { extraction_profile_id: 2 },
  progress: { stage: "queued", percentage: 0, processed: 0, total: null, message: null, heartbeat_at: null },
  result: null, error: null, discovery_snapshot_id: null,
  created_at: "2026-07-02T12:00:00Z", completed_at: null,
};

describe("ValidationCrawlPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthStore.getState().setUser({ id: 1, name: "Operator", email: "operator@example.com", is_platform_admin: true, permissions: ["crawler.view", "crawler.operations.execute"] });
  });

  it("selects the newest eligible profile and queues its validation", async () => {
    vi.mocked(queueProfileValidation).mockResolvedValue(queuedOperation);
    render(<ValidationCrawlPanel activeOnboarding={null} agencyId={42} initialOperations={[]} profiles={[profile(1, 1, "approved"), profile(2, 2, "candidate")]} />);

    expect(screen.getByLabelText("Perfil de Extração")).toHaveValue("2");
    expect(screen.getByText("#2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Rodar Crawl de Validação" }));
    await waitFor(() => expect(queueProfileValidation).toHaveBeenCalledWith(2));
  });

  it("explains why onboarding owns the validation command", () => {
    render(<ValidationCrawlPanel activeOnboarding={{ id: 9, current_step: "profile_validation", operations: [] }} agencyId={42} initialOperations={[]} profiles={[profile(2, 2, "candidate")]} />);

    expect(screen.getByText("Validação controlada pelo Onboarding")).toBeInTheDocument();
    expect(screen.getByText(/preservar a sequência, as tentativas e o histórico/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rodar Crawl de Validação" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Abrir Onboarding" })).toHaveAttribute("href", "/admin/crawler/agencies/42/onboarding/9");
  });
});
