import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterSelect } from "../filter-select";

const options = [
  { value: "all", label: "Todas" },
  { value: "judicial", label: "Judicial" },
];

describe("FilterSelect", () => {
  it("offers no clear button while the filter is empty", () => {
    render(<FilterSelect aria-label="Modalidade" emptyValue="all" onValueChange={vi.fn()} options={options} value="all" />);

    expect(screen.queryByRole("button", { name: /limpar filtro/i })).not.toBeInTheDocument();
  });

  it("clears an active filter back to the empty value", () => {
    const onValueChange = vi.fn();

    render(
      <FilterSelect aria-label="Modalidade" emptyValue="all" onValueChange={onValueChange} options={options} value="judicial" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Limpar filtro Modalidade: Judicial" }));

    expect(onValueChange).toHaveBeenCalledWith("all");
  });
});
