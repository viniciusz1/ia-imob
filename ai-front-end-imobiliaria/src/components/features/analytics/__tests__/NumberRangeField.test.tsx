import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberRangeField } from "../NumberRangeField";
import { formatCurrencyInput } from "../numberInput";

describe("NumberRangeField", () => {
  it("shows the stored value already formatted", () => {
    render(
      <NumberRangeField
        id="price"
        label="Preço"
        format={formatCurrencyInput}
        minValue="350000"
        maxValue=""
        minPlaceholder="Mínimo"
        maxPlaceholder="Máximo"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("R$ 350.000")).toBeInTheDocument();
  });

  it("keeps only the digits typed by the user", () => {
    const onChange = vi.fn();
    render(
      <NumberRangeField
        id="price"
        label="Preço"
        format={formatCurrencyInput}
        minValue=""
        maxValue=""
        minPlaceholder="Mínimo"
        maxPlaceholder="Máximo"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Mínimo"), { target: { value: "R$ 250abc" } });

    expect(onChange).toHaveBeenCalledWith({ min: "250", max: "" });
  });

  it("ignores input made only of letters", () => {
    const onChange = vi.fn();
    render(
      <NumberRangeField
        id="area"
        label="Área"
        format={formatCurrencyInput}
        minValue=""
        maxValue=""
        minPlaceholder="Mínima"
        maxPlaceholder="Máxima"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Mínima"), { target: { value: "abc" } });

    expect(onChange).toHaveBeenCalledWith({ min: "", max: "" });
  });
});
