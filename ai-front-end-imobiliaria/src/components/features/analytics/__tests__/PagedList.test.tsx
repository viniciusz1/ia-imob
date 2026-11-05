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
  it("paginates in blocks of 10 by default", () => {
    render(<Harness total={183} />);

    expect(PAGE_SIZE).toBe(10);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 10")).toBeInTheDocument();
    expect(screen.queryByText("Item 11")).not.toBeInTheDocument();
  });

  it("advances to the next page without dropping items", () => {
    render(<Harness total={183} />);

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("Item 11")).toBeInTheDocument();
    expect(screen.getByText("Item 20")).toBeInTheDocument();
    expect(screen.queryByText("Item 10")).not.toBeInTheDocument();
  });

  it("reaches the last item of a partial final page", () => {
    render(<Harness total={183} />);

    for (let index = 0; index < 18; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Próxima" }));
    }

    expect(screen.getByText("Item 183")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("reports the visible range and the full total", () => {
    render(<Harness total={183} />);

    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Exibindo 1–10 de 183 itens"),
    ).toBeInTheDocument();
  });

  it("jumps straight to a numbered page", () => {
    render(<Harness total={183} />);

    fireEvent.click(screen.getByRole("button", { name: "Página 19" }));

    expect(screen.getByText("Item 183")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 19" })).toHaveAttribute("aria-current", "page");
  });

  it("disables the previous button on the first page", () => {
    render(<Harness total={183} />);

    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
  });

  it("keeps the footer when everything fits on one page", () => {
    render(<Harness total={7} />);

    expect(screen.getByText("Item 7")).toBeInTheDocument();
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Exibindo 1–7 de 7 itens"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("handles an empty list without offering navigation", () => {
    render(<Harness total={0} />);

    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent === "Exibindo 0–0 de 0 itens"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });
});
