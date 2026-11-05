import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "../useDebouncedValue";

describe("useDebouncedValue", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("only publishes the value after it stops changing for the delay", () => {
        const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 400), {
            initialProps: { value: "a" },
        });

        expect(result.current).toBe("a");

        rerender({ value: "aa" });
        act(() => vi.advanceTimersByTime(200));
        rerender({ value: "aaa" });
        act(() => vi.advanceTimersByTime(200));

        // Typing kept resetting the timer, so nothing was published yet.
        expect(result.current).toBe("a");

        act(() => vi.advanceTimersByTime(400));
        expect(result.current).toBe("aaa");
    });
});
