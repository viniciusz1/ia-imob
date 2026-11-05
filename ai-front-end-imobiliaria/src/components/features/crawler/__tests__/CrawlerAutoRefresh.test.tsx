import { act, render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CrawlerAutoRefresh } from "../CrawlerAutoRefresh";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

const mockedUseRouter = vi.mocked(useRouter);

function routerWithRefresh(refresh: () => void): ReturnType<typeof useRouter> {
  return {
    back: vi.fn(),
    forward: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh,
  };
}

function RouterHarness() {
  const [, setVersion] = useState(0);

  mockedUseRouter.mockReturnValue(routerWithRefresh(() => setVersion((version) => version + 1)));

  return <CrawlerAutoRefresh />;
}

describe("CrawlerAutoRefresh", () => {
  const refresh = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    refresh.mockReset();
    mockedUseRouter.mockReturnValue(routerWithRefresh(refresh));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refreshes crawler server data every five seconds", () => {
    render(<CrawlerAutoRefresh />);

    expect(screen.getByRole("status")).toHaveTextContent("Atualizando em 5 segundos");

    act(() => vi.advanceTimersByTime(1_000));
    expect(screen.getByRole("status")).toHaveTextContent("Atualizando em 4 segundos");

    act(() => vi.advanceTimersByTime(3_999));
    expect(refresh).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Atualizando em 5 segundos");

    act(() => vi.advanceTimersByTime(5_000));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("clears the polling timer when leaving the crawler module", () => {
    const { unmount } = render(<CrawlerAutoRefresh />);

    unmount();
    act(() => vi.advanceTimersByTime(5_000));

    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not update the Router from inside the state updater", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(<RouterHarness />);

    act(() => vi.advanceTimersByTime(5_000));

    expect(consoleError).not.toHaveBeenCalledWith(
      expect.stringContaining("Cannot update a component (`%s`)"),
      "RouterHarness",
      "CrawlerAutoRefresh",
      "CrawlerAutoRefresh",
    );
  });
});
