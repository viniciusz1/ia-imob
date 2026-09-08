import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DistributionBars } from "../DistributionBars";

describe("DistributionBars", () => {
  it("lists each item with its count and share", () => {
    render(
      <DistributionBars
        items={[
          { label: "Jaraguá do Sul", count: 3398, share: 0.8322 },
          { label: "Guaramirim", count: 261, share: 0.0639 },
        ]}
      />,
    );

    expect(screen.getByText("Jaraguá do Sul")).toBeInTheDocument();
    expect(screen.getByText("3.398 · 83,2%")).toBeInTheDocument();
    expect(screen.getByText("261 · 6,4%")).toBeInTheDocument();
  });

  it("respects the requested limit", () => {
    render(
      <DistributionBars
        items={[
          { label: "Centro", count: 10, share: 0.5 },
          { label: "Amizade", count: 6, share: 0.3 },
          { label: "Vila Nova", count: 4, share: 0.2 },
        ]}
        limit={2}
      />,
    );

    expect(screen.getByText("Centro")).toBeInTheDocument();
    expect(screen.queryByText("Vila Nova")).not.toBeInTheDocument();
  });

  it("explains an empty distribution", () => {
    render(<DistributionBars items={[]} />);

    expect(screen.getByText("Sem imóveis neste recorte.")).toBeInTheDocument();
  });
})
