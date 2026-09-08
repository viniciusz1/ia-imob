import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListingRows } from "../ListingRows";
import type { RankedListing } from "@/types/analytics";

const listing: RankedListing = {
  id: 1,
  type: "Casa",
  price: 1250000,
  area: 180,
  price_per_square_metre: 6944.44,
  neighbourhood: "Vila Nova",
  city: "Jaraguá do Sul",
  agency: "ITAIVAN Imobiliária",
  listing_url: "https://itaivan.test/imovel/1",
};

describe("ListingRows", () => {
  it("leads with the type and neighbourhood and keeps the prices on the right", () => {
    render(<ListingRows items={[listing]} />);

    expect(screen.getByText(/Casa/)).toBeInTheDocument();
    expect(screen.getByText(/Vila Nova/)).toBeInTheDocument();
    expect(screen.getByText("R$ 1.250.000")).toBeInTheDocument();
    expect(screen.getByText("R$ 6.944/m²")).toBeInTheDocument();
  });

  it("gathers area, city and agency into one secondary line", () => {
    render(<ListingRows items={[listing]} />);

    expect(
      screen.getByText("180 m² · Jaraguá do Sul · ITAIVAN Imobiliária"),
    ).toBeInTheDocument();
  });

  it("omits the missing pieces instead of printing empty separators", () => {
    render(
      <ListingRows
        items={[{ ...listing, area: null, agency: null, price_per_square_metre: null }]}
      />,
    );

    expect(screen.getByText("Jaraguá do Sul")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("links to the source listing when there is one", () => {
    render(<ListingRows items={[listing]} />);

    expect(screen.getByLabelText("Abrir anúncio")).toHaveAttribute(
      "href",
      "https://itaivan.test/imovel/1",
    );
  });

  it("drops the link when the listing has no url", () => {
    render(<ListingRows items={[{ ...listing, listing_url: null }]} />);

    expect(screen.queryByLabelText("Abrir anúncio")).not.toBeInTheDocument();
  });

  it("explains an empty ranking", () => {
    render(<ListingRows items={[]} />);

    expect(screen.getByText("Sem imóveis neste recorte.")).toBeInTheDocument();
  });
});
