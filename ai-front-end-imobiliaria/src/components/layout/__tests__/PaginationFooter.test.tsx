import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaginationFooter, visiblePages } from "../PaginationFooter";

describe("visiblePages", () => {
    it("keeps first, last and the neighbours of the current page", () => {
        expect(visiblePages(5, 10)).toEqual([1, "gap-start", 4, 5, 6, "gap-end", 10]);
        expect(visiblePages(1, 3)).toEqual([1, 2, 3]);
        expect(visiblePages(1, 1)).toEqual([1]);
    });
});

describe("PaginationFooter", () => {
    it("summarises the visible range and changes page", () => {
        const onPageChange = vi.fn();

        render(<PaginationFooter onPageChange={onPageChange} page={2} pageCount={6} total={57} />);

        expect(screen.getByText(/11–20/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page");

        fireEvent.click(screen.getByRole("button", { name: /próxima/i }));
        expect(onPageChange).toHaveBeenCalledWith(3);

        fireEvent.click(screen.getByRole("button", { name: "Página 6" }));
        expect(onPageChange).toHaveBeenCalledWith(6);
    });

    it("disables the edges", () => {
        render(<PaginationFooter onPageChange={vi.fn()} page={1} pageCount={1} />);

        expect(screen.getByRole("button", { name: /anterior/i })).toBeDisabled();
        expect(screen.getByRole("button", { name: /próxima/i })).toBeDisabled();
    });
});
