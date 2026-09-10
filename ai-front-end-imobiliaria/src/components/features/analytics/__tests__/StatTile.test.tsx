import { render, screen } from "@testing-library/react";
import { Coins } from "lucide-react";
import { describe, expect, it } from "vitest";
import { StatTile } from "../StatTile";

describe("StatTile", () => {
  it("shows the label and the figure", () => {
    render(<StatTile icon={Coins} label="Preço mediano" value="R$ 490.000" />);

    expect(screen.getByText("R$ 490.000")).toBeInTheDocument();
    expect(screen.getByText("Preço mediano")).toBeInTheDocument();
  });

  it("suppresses the figure when the sample is insufficient", () => {
    render(
      <StatTile icon={Coins} label="Preço mediano" value="R$ 490.000" insufficientSample />,
    );

    expect(screen.queryByText("R$ 490.000")).not.toBeInTheDocument();
    expect(screen.getByTitle("Amostra insuficiente")).toBeInTheDocument();
  });
});
