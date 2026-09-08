import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatTile } from "../StatTile";

describe("StatTile", () => {
  it("shows the value with its label and context", () => {
    render(
      <StatTile
        label="Preço mediano"
        value="R$ 490.000"
        context="Metade central entre R$ 230.000 e R$ 897.000"
      />,
    );

    expect(screen.getByText("R$ 490.000")).toBeInTheDocument();
    expect(screen.getByText("Preço mediano")).toBeInTheDocument();
    expect(screen.getByText("Metade central entre R$ 230.000 e R$ 897.000")).toBeInTheDocument();
  });

  it("replaces the value with the reason when the sample is insufficient", () => {
    render(
      <StatTile
        label="Preço mediano"
        value="R$ 490.000"
        context="Metade central entre R$ 230.000 e R$ 897.000"
        sampleSize={3}
        insufficientSample
      />,
    );

    expect(screen.queryByText("R$ 490.000")).not.toBeInTheDocument();
    expect(screen.getByText("Amostra insuficiente: 3 imóveis")).toBeInTheDocument();
  });
});
