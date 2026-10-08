import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";


import { MarketBreakdownTable } from "../MarketBreakdownTable";
import type { MarketPricing, MarketRankings } from "@/types/analytics";

/** Radix activates a tab on focus/mousedown, not on a bare click. */
function selectTab(name: string) {
  const trigger = screen.getByRole("tab", { name });
  fireEvent.mouseDown(trigger);
  fireEvent.focus(trigger);
}

const pricing = {
  by_type: {
    indicator: "A2.11",
    items: [
      {
        label: "Casa",
        median: 690000,
        median_per_square_metre: 4200,
        sample_size: 1200,
        outliers_discarded: 10,
        insufficient_sample: false,
      },
      {
        label: "Studio",
        median: null,
        median_per_square_metre: null,
        sample_size: 3,
        outliers_discarded: 0,
        insufficient_sample: true,
      },
    ],
  },
  by_bedrooms: {
    indicator: "A2.12",
    items: [
      {
        label: "3",
        median: 750000,
        median_per_square_metre: 4500,
        sample_size: 900,
        outliers_discarded: 4,
        insufficient_sample: false,
      },
    ],
  },
} as unknown as MarketPricing;

function rankingsWith(count: number): MarketRankings {
  return {
    neighbourhoods_by_price: {
      indicator: "A2.05",
      items: Array.from({ length: count }, (_, index) => ({
        label: `Bairro ${index + 1}`,
        median: 1_000_000 - index * 1000,
        sample_size: 20,
      })),
    },
    neighbourhoods_by_square_metre: {
      indicator: "A2.06",
      items: [{ label: "Bairro 1", median: 8100, sample_size: 20 }],
    },
  };
}

describe("MarketBreakdownTable", () => {
  it("opens on the property type breakdown", () => {
    render(<MarketBreakdownTable pricing={pricing} rankings={rankingsWith(3)} />);

    expect(screen.getByText("Casa")).toBeInTheDocument();
    expect(screen.getByText("R$ 690.000")).toBeInTheDocument();
    expect(screen.getByText("R$ 4.200/m²")).toBeInTheDocument();
    expect(screen.getByText("1.200")).toBeInTheDocument();
  });

  it("suppresses the median of a group under the minimum sample", () => {
    render(<MarketBreakdownTable pricing={pricing} rankings={rankingsWith(3)} />);

    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.queryByText("R$ 0")).not.toBeInTheDocument();
  });

  it("switches the grouping to bedrooms", () => {
    render(<MarketBreakdownTable pricing={pricing} rankings={rankingsWith(3)} />);

    selectTab("Quartos");

    expect(screen.getByText("R$ 750.000")).toBeInTheDocument();
  });

  it("groups by neighbourhood and pairs the square metre median by label", () => {
    render(<MarketBreakdownTable pricing={pricing} rankings={rankingsWith(3)} />);

    selectTab("Bairro");

    expect(screen.getByText("Bairro 1")).toBeInTheDocument();
    expect(screen.getByText("R$ 8.100/m²")).toBeInTheDocument();
  });

  it("paginates the neighbourhood grouping", () => {
    render(<MarketBreakdownTable pricing={pricing} rankings={rankingsWith(50)} />);

    selectTab("Bairro");

    expect(screen.getByText("Bairro 20")).toBeInTheDocument();
    expect(screen.queryByText("Bairro 21")).not.toBeInTheDocument();
    expect(screen.getByText("1-20 de 50 grupos")).toBeInTheDocument();
  });
});
