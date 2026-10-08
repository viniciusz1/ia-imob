import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DatePicker } from "../date-picker";

describe("DatePicker", () => {
  it("shows the date in pt-BR and emits ISO dates", () => {
    const onChange = vi.fn();

    render(<DatePicker aria-label="Data inicial" onChange={onChange} value="2026-09-10" />);

    const trigger = screen.getByRole("button", { name: "Data inicial" });
    expect(trigger).toHaveTextContent("10/09/2026");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: /15 de setembro de 2026/i }));

    expect(onChange).toHaveBeenCalledWith("2026-09-15");
  });

  it("clears the value", () => {
    const onChange = vi.fn();

    render(<DatePicker aria-label="Data inicial" onChange={onChange} value="2026-09-10" />);
    fireEvent.click(screen.getByRole("button", { name: "Limpar data" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("keeps the time when used as a date-time field", () => {
    const onChange = vi.fn();

    render(<DatePicker aria-label="De" onChange={onChange} value="2026-09-10T14:30" withTime />);

    expect(screen.getByRole("button", { name: "De" })).toHaveTextContent("10/09/2026 às 14:30");

    fireEvent.click(screen.getByRole("button", { name: "De" }));
    fireEvent.click(screen.getByRole("button", { name: /12 de setembro de 2026/i }));

    expect(onChange).toHaveBeenCalledWith("2026-09-12T14:30");
  });
});
