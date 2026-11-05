import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useClientPagination } from "../useClientPagination";

const items = Array.from({ length: 23 }, (_, index) => index + 1);

describe("useClientPagination", () => {
    it("pages ten items at a time by default", () => {
        const { result } = renderHook(() => useClientPagination(items));

        expect(result.current.pageCount).toBe(3);
        expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

        act(() => result.current.setPage(3));
        expect(result.current.pageItems).toEqual([21, 22, 23]);
    });

    it("stays on a real page when the list shrinks", () => {
        const { result, rerender } = renderHook(({ list }) => useClientPagination(list), {
            initialProps: { list: items },
        });

        act(() => result.current.setPage(3));
        rerender({ list: items.slice(0, 5) });

        expect(result.current.page).toBe(1);
        expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5]);
    });

    it("always reports at least one page", () => {
        const { result } = renderHook(() => useClientPagination([]));

        expect(result.current.pageCount).toBe(1);
        expect(result.current.pageItems).toEqual([]);
    });
});
