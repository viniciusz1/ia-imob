import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MultiSelectFilter } from "../MultiSelectFilter";

describe("MultiSelectFilter", () => {
  it("summarises the selection on the trigger", () => {
    render(
      <MultiSelectFilter
        label="Tipo de imóvel"
        placeholder="Todos os tipos"
        values={["Casa", "Apartamento", "Terreno"]}
        selected={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Todos os tipos")).toBeInTheDocument();
  });

  it("names the single selected value", () => {
    render(
      <MultiSelectFilter
        label="Tipo de imóvel"
        placeholder="Todos os tipos"
        values={["Casa", "Apartamento"]}
        selected={["Casa"]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { expanded: false })).toHaveTextContent("Casa");
  });

  it("counts a multiple selection and shows a pill for each value", () => {
    render(
      <MultiSelectFilter
        label="Tipo de imóvel"
        placeholder="Todos os tipos"
        values={["Casa", "Apartamento"]}
        selected={["Casa", "Apartamento"]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("2 selecionados")).toBeInTheDocument();
    expect(screen.getByLabelText("Remover Casa")).toBeInTheDocument();
    expect(screen.getByLabelText("Remover Apartamento")).toBeInTheDocument();
  });

  it("removes a value through its pill", () => {
    const onChange = vi.fn();
    render(
      <MultiSelectFilter
        label="Quartos"
        placeholder="Qualquer quantidade"
        values={[1, 2, 5]}
        selected={[2, 5]}
        renderLabel={(value) => (value === 5 ? "5 ou mais" : String(value))}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText("Remover 5 ou mais"));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("disables the dropdown when there is nothing to choose", () => {
    render(
      <MultiSelectFilter
        label="Bairro"
        placeholder="Todos os bairros"
        values={[]}
        selected={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { expanded: false })).toBeDisabled();
  });
});
