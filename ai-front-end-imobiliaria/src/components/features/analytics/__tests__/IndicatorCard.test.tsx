import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { IndicatorCard } from "../IndicatorCard";

describe("IndicatorCard", () => {
  it("shows the value and the sample size", () => {
    render(
      <IndicatorCard
        indicator="A2.01"
        title="Preço mediano"
        value="R$ 490.000"
        sampleSize={3767}
      />,
    );

    expect(screen.getByText("R$ 490.000")).toBeInTheDocument();
    expect(screen.getByText("A2.01")).toBeInTheDocument();
    expect(screen.getByText("3.767 imóveis")).toBeInTheDocument();
  });

  it("hides the value when the sample is insufficient", () => {
    render(
      <IndicatorCard
        indicator="A2.01"
        title="Preço mediano"
        value="R$ 490.000"
        sampleSize={3}
        insufficientSample
      />,
    );

    expect(screen.queryByText("R$ 490.000")).not.toBeInTheDocument();
    expect(screen.getByText("Amostra insuficiente (3 imóveis).")).toBeInTheDocument();
  });
})
