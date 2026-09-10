import { fireEvent, render, screen } from "@testing-library/react";
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

  it("shows every item when the list fits on a single page", () => {
    render(
      <DistributionBars
        items={[
          { label: "Centro", count: 10, share: 0.5 },
          { label: "Amizade", count: 6, share: 0.3 },
          { label: "Vila Nova", count: 4, share: 0.2 },
        ]}
      />,
    );

    expect(screen.getByText("Centro")).toBeInTheDocument();
    expect(screen.getByText("Vila Nova")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Próxima" })).not.toBeInTheDocument();
  });

  it("paginates a long distribution instead of silently dropping items", () => {
    const items = Array.from({ length: 183 }, (_, index) => ({
      label: `Bairro ${index + 1}`,
      count: 183 - index,
      share: (183 - index) / 16836,
    }));

    render(<DistributionBars items={items} noun="bairros" />);

    expect(screen.getByText("Bairro 20")).toBeInTheDocument();
    expect(screen.queryByText("Bairro 21")).not.toBeInTheDocument();
    expect(screen.getByText("1-20 de 183 bairros")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("Bairro 21")).toBeInTheDocument();
  });

  it("explains an empty distribution", () => {
    render(<DistributionBars items={[]} />);

    expect(screen.getByText("Sem imóveis neste recorte.")).toBeInTheDocument();
  });
})
