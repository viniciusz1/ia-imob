import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrawlerOperation, CrawlerOperationQueue } from "@/types/crawler";
import { CrawlerOperationQueueClient } from "../CrawlerOperationQueueClient";

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
  cancel: vi.fn(),
  canCancel: true,
}));
vi.mock("@/hooks/usePermission", () => ({
  usePermission: () => mocks.canCancel,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/services/crawlerService", () => ({
  getCrawlerOperationQueue: mocks.queue,
  cancelCrawlerOperation: mocks.cancel,
}));

function operation(overrides: Partial<CrawlerOperation>): CrawlerOperation {
  return {
    id: 1,
    type: "production_crawl",
    state: "queued",
    crawl_agency_id: 10,
    crawl_agency: { id: 10, name: "Imobiliária Centro" },
    requester: { id: 1, name: "Admin" },
    worker: null,
    market_data_contract_version_id: null,
    retry_of_operation_id: null,
    equivalence_key: null,
    plan: {},
    progress: {
      stage: "queued",
      percentage: 0,
      processed: 0,
      total: null,
      message: null,
      heartbeat_at: null,
    },
    result: null,
    error: null,
    discovery_snapshot_id: null,
    created_at: "2026-10-25T10:00:00Z",
    claimed_at: null,
    completed_at: null,
    ...overrides,
  };
}

const queue: CrawlerOperationQueue = {
  running: [
    operation({
      id: 40,
      state: "running",
      worker: { id: 3, worker_key: "worker-a" },
      claimed_at: "2026-10-25T09:50:00Z",
      progress: {
        stage: "extraction",
        percentage: 45,
        processed: 9,
        total: 20,
        message: null,
        heartbeat_at: "2026-10-25T10:01:00Z",
      },
    }),
  ],
  data: [
    {
      position: 1,
      blocked_by_operation_id: 40,
      operation: operation({ id: 41 }),
    },
    {
      position: 2,
      blocked_by_operation_id: null,
      operation: operation({
        id: 42,
        type: "prospecting",
        crawl_agency_id: null,
        crawl_agency: null,
        plan: { city: "Joinville", state: "SC" },
      }),
    },
    {
      position: 3,
      blocked_by_operation_id: null,
      operation: operation({
        id: 43,
        type: "discovery",
        crawl_agency_id: 11,
        crawl_agency: { id: 11, name: "Imobiliária Norte" },
      }),
    },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 3 },
};

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CrawlerOperationQueueClient initialQueue={queue} />
    </QueryClientProvider>,
  );
}

function waitingRows() {
  const table = screen
    .getByRole("heading", { name: /próximas na fila/i })
    .closest("section");
  if (!table) throw new Error("waiting section not found");
  return within(table).getAllByRole("row").slice(1);
}

describe("CrawlerOperationQueueClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canCancel = true;
    mocks.queue.mockResolvedValue(queue);
  });

  it("shows what is running and the queued operations in worker order", () => {
    mount();

    expect(
      screen.getByRole("heading", { name: "Em execução agora (1)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("worker-a")).toBeInTheDocument();
    expect(screen.getByText(/Extração · 45% · 9\/20/)).toBeInTheDocument();

    const rows = waitingRows();
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual([
      "1º",
      "2º",
      "3º",
    ]);
    expect(within(rows[0]).getByText("Aguardando #40")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Próxima")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Joinville/SC")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Na fila")).toBeInTheDocument();
    expect(within(rows[0]).getByRole("link", { name: "#41" })).toHaveAttribute(
      "href",
      "/admin/crawler/agencies/10/crawls/operations/41",
    );
  });

  it("confirms before cancelling a queued operation", async () => {
    mocks.cancel.mockResolvedValue({ ...queue.data[2].operation, state: "cancelled" });
    mount();

    fireEvent.click(
      within(waitingRows()[2]).getByRole("button", { name: "Cancelar" }),
    );
    expect(mocks.cancel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar operação" }));

    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith(43));
    await waitFor(() => expect(mocks.queue).toHaveBeenCalledWith(1));
  });

  it("hides cancel actions without the cancel permission", () => {
    mocks.canCancel = false;
    mount();

    expect(
      screen.queryByRole("button", { name: "Cancelar" }),
    ).not.toBeInTheDocument();
  });
});
