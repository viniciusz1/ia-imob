import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAGE_SIZE, PaginationFooter, usePagedItems } from "../PagedList";

function Harness({ total, pageSize }: { total: number; pageSize?: number }) {
  const items = Array.from({ length: total }, (_, index) => `Item ${index + 1}`);
  const paged = usePagedItems(items, pageSize);

  return (
    <div>
      <ul>
        {paged.pageItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <PaginationFooter paged={paged} noun="itens" />
    </div>
  );
}

describe("usePagedItems", () => {
  it("paginates in blocks of 20 by default", () => {
    render(<Harness total={183} />);

    expect(PAGE_SIZE).toBe(20);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 20")).toBeInTheDocument();
    expect(screen.queryByText("Item 21")).not.toBeInTheDocument();
  });

  it("advances to the next page without dropping items", () => {
    render(<Harness total={183} />);

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("Item 21")).toBeInTheDocument();
    expect(screen.getByText("Item 40")).toBeInTheDocument();
    expect(screen.queryByText("Item 20")).not.toBeInTheDocument();
  });

  it("reaches the last item of a partial final page", () => {
    render(<Harness total={183} />);

    for (let index = 0; index < 9; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    }

    expect(screen.getByText("Item 183")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("reports the visible range and the full total", () => {
    render(<Harness total={183} />);

    expect(screen.getByText("1-20 de 183 itens")).toBeInTheDocument();
  });

  it("disables the previous button on the first page", () => {
    render(<Harness total={183} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  });

  it("hides the footer when everything fits on one page", () => {
    render(<Harness total={14} />);

    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument();
    expect(screen.getByText("Item 14")).toBeInTheDocument();
  });

  it("handles an empty list without offering navigation", () => {
    render(<Harness total={0} />);

    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument();
  });
});
