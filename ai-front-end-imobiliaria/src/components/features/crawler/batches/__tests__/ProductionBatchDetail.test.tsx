import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BatchDiagnosticsPage,
  BatchPage,
  ProductionBatch,
  ProductionBatchItem,
} from "@/types/productionBatch";
import { ProductionBatchDetail } from "../ProductionBatchDetail";

const mocks = vi.hoisted(() => ({ rerun: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/hooks/usePermission", () => ({ usePermission: () => true }));
vi.mock("@/services/productionBatchService", () => ({
  getProductionBatch: vi.fn(),
  listProductionBatchItems: vi.fn(),
  getBatchDiagnostics: vi.fn(),
  rerunProductionBatch: mocks.rerun,
}));
const meta = { current_page: 1, last_page: 1, per_page: 25, total: 0 };
const diagnostics: BatchDiagnosticsPage = {
  data: [],
  meta,
  summary: { errors: [], strategies: [], fields: [], stages: [] },
};
const batch: ProductionBatch = {
  id: 7,
  name: "Crawls noturnos",
  source_group_id: null,
  requester: { id: 1, name: "Admin" },
  state: "awaiting_quality",
  result: "in_progress",
  historical_incomplete: false,
  created_at: "2026-10-22T00:00:00Z",
  started_at: null,
  completed_at: null,
  progress_percentage: 0,
  counts: {
    requested: 1,
    enqueued: 1,
    skipped: 0,
    technical_succeeded: 1,
    queued: 0,
    running: 0,
    awaiting_quality: 1,
    published: 0,
    quarantined: 0,
    failed: 0,
    cancelled: 0,
    raw: 2,
    normalized: 1,
    rejected: 1,
  },
};
const items: BatchPage<ProductionBatchItem> = { data: [], meta };
function mount(current: ProductionBatch = batch) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ProductionBatchDetail
        initialBatch={current}
        initialItems={items}
        initialDiagnostics={diagnostics}
      />
    </QueryClientProvider>,
  );
}

describe("ProductionBatchDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("separates technical success from pending quality", () => {
    mount();
    expect(
      screen.getByRole("heading", { name: /lote #7/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Aguardando qualidade").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Sucesso técnico")).toBeInTheDocument();
    expect(screen.getByText("Publicados")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /reexecutar problemas/i }),
    ).not.toBeInTheDocument();
  });
  it("confirms reruns and opens a new batch without rewriting the source", async () => {
    mocks.rerun.mockResolvedValue({ batch: { ...batch, id: 8 } });
    mount({
      ...batch,
      state: "completed",
      result: "failed",
      counts: { ...batch.counts, failed: 1, awaiting_quality: 0 },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /reexecutar problemas/i }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /confirmar reexecução/i }),
    );
    await waitFor(() =>
      expect(mocks.push).toHaveBeenCalledWith("/admin/crawler/batches/8"),
    );
    expect(mocks.rerun).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        request_key: expect.any(String),
        confirmed: true,
      }),
    );
  });
});
