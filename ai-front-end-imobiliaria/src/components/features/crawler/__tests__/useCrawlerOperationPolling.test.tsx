import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getCrawlerOperation } from "@/services/crawlerService";
import type { CrawlerOperation } from "@/types/crawler";

import { useCrawlerOperationPolling } from "../useCrawlerOperationPolling";

vi.mock("@/services/crawlerService", () => ({
  getCrawlerOperation: vi.fn(),
}));

function operation(state: CrawlerOperation["state"] = "running"): CrawlerOperation {
  return {
    id: 91,
    type: "profile_generation",
    state,
    crawl_agency_id: 42,
    market_data_contract_version_id: 1,
    retry_of_operation_id: null,
    equivalence_key: "profile-42",
    plan: { crawl_agency_id: 42 },
    progress: { stage: "profile_generation", percentage: 40, processed: 2, total: 5, message: "Gerando schemas", heartbeat_at: null },
    result: null,
    error: null,
    discovery_snapshot_id: null,
    created_at: "2026-07-15T12:00:00Z",
    completed_at: null,
  };
}

describe("useCrawlerOperationPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getCrawlerOperation).mockResolvedValue(operation());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("backs off when hidden and stops after the operation becomes terminal", async () => {
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    const onOperation = vi.fn();
    const { rerender } = renderHook(
      ({ tracked }) => useCrawlerOperationPolling({ operations: tracked, onOperation }),
      { initialProps: { tracked: [operation()] } },
    );

    await act(async () => { await vi.advanceTimersByTimeAsync(3_000); });
    expect(getCrawlerOperation).toHaveBeenCalledTimes(1);

    visibility = "hidden";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => { await vi.advanceTimersByTimeAsync(29_999); });
    expect(getCrawlerOperation).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(getCrawlerOperation).toHaveBeenCalledTimes(2);

    rerender({ tracked: [operation("succeeded")] });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(getCrawlerOperation).toHaveBeenCalledTimes(2);
  });
});
