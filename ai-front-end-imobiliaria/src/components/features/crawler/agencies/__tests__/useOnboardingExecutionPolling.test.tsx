import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOnboardingExecution } from "@/services/crawlerService";
import type { OnboardingExecution } from "@/types/crawler";

import { useOnboardingExecutionPolling } from "../useOnboardingExecutionPolling";

vi.mock("@/services/crawlerService", () => ({
  getOnboardingExecution: vi.fn(),
}));

const running = {
  id: 91,
  state: "running",
} as OnboardingExecution;

describe("useOnboardingExecutionPolling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(getOnboardingExecution).mockResolvedValue(running);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("recovers immediately after reload, backs off in background, and stops when terminal", async () => {
    let visibility: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
    const onExecution = vi.fn();
    const { rerender } = renderHook(
      ({ current }) => useOnboardingExecutionPolling({ execution: current, onExecution }),
      { initialProps: { current: running } },
    );

    await act(async () => { await Promise.resolve(); });
    expect(getOnboardingExecution).toHaveBeenCalledTimes(1);
    expect(onExecution).toHaveBeenCalledWith(running);

    visibility = "hidden";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    await act(async () => { await vi.advanceTimersByTimeAsync(29_999); });
    expect(getOnboardingExecution).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(getOnboardingExecution).toHaveBeenCalledTimes(2);

    rerender({ current: { ...running, state: "completed" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(getOnboardingExecution).toHaveBeenCalledTimes(2);
  });
});
