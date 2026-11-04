import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePermission } from "@/hooks/usePermission";
import { rejectCrawlRunQuality } from "@/services/crawlerService";
import type { CrawlRun } from "@/types/crawler";

import { ExceptionalPublicationPanel } from "../ExceptionalPublicationPanel";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/hooks/usePermission", () => ({
  usePermission: vi.fn(),
}));

vi.mock("@/services/crawlerService", () => ({
  createQualityException: vi.fn(),
  publishCrawlRunExceptionally: vi.fn(),
  rejectCrawlRunQuality: vi.fn(),
}));

const mockedReject = vi.mocked(rejectCrawlRunQuality);
const mockedUsePermission = vi.mocked(usePermission);

const run: CrawlRun = {
  id: 9,
  operation_id: 9,
  crawl_agency_id: 1,
  discovery_snapshot_id: 1,
  extraction_profile_id: 1,
  market_data_contract_version_id: 1,
  quality_policy_version_id: 1,
  technical_state: "succeeded",
  result_kind: "full",
  publication_state: "quarantined",
  publishable: false,
  quality_report: {
    id: 4,
    verdict: "blocked",
    blockers: ["stock_drop_above_threshold"],
    warnings: [],
    evidence: { baseline: { normalized_average: 100 }, ratios: { stock_drop: 0.6 } },
    market_data_contract_version_id: 1,
    quality_policy_version_id: 1,
    evaluated_at: "2026-07-15T12:00:00Z",
  },
  exceptional_publication: null,
  quality_rejection: null,
  counts: { raw: 40, normalized: 40, rejected: 0, errors: 0 },
  error_summary: [],
  published_at: null,
  quarantined_at: "2026-07-15T12:00:00Z",
  started_at: "2026-07-15T11:00:00Z",
  completed_at: "2026-07-15T12:00:00Z",
  created_at: "2026-07-15T11:00:00Z",
};

describe("ExceptionalPublicationPanel", () => {
  beforeEach(() => {
    mockedReject.mockReset();
    mockedUsePermission.mockReset();
    mockedUsePermission.mockReturnValue(true);
    refresh.mockReset();
  });

  it("requires evidence review and a reason before exceptional publication", () => {
    render(<ExceptionalPublicationPanel initialRun={run} />);

    expect(screen.getByText("stock_drop_above_threshold")).toBeInTheDocument();
    expect(screen.getByText(/normalized_average/)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /justificativa/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recusar publicação/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /publicar excepcionalmente/i })).toBeDisabled();
  });

  it("lets the operator refuse publication and preserves the decision", async () => {
    mockedReject.mockResolvedValue({
      ...run,
      quality_rejection: {
        rejected_by: 7,
        reason: "Os dados não possuem nenhum anúncio válido para publicação.",
        rejected_at: "2026-07-15T12:10:00Z",
      },
    });

    render(<ExceptionalPublicationPanel initialRun={run} />);
    fireEvent.change(screen.getByRole("textbox", { name: /justificativa/i }), {
      target: { value: "Os dados não possuem nenhum anúncio válido para publicação." },
    });
    fireEvent.click(screen.getByRole("button", { name: /recusar publicação/i }));
    fireEvent.click(await screen.findByRole("button", { name: /confirmar recusa/i }));

    await waitFor(() => expect(mockedReject).toHaveBeenCalledWith(
      9,
      "Os dados não possuem nenhum anúncio válido para publicação.",
    ));
    expect(await screen.findByText(/publicação recusada por #7/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publicar excepcionalmente/i })).not.toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("only offers refusal to operators allowed to review snapshots", () => {
    mockedUsePermission.mockImplementation((permission) => permission !== "crawler.snapshots.review");

    render(<ExceptionalPublicationPanel initialRun={run} />);

    expect(screen.queryByRole("button", { name: /recusar publicação/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /publicar excepcionalmente/i })).toBeInTheDocument();
  });
});
