import type { MarketRankings } from "@/types/analytics";
import { ListingRows } from "./ListingRows";
import { TabbedPanel } from "./TabbedPanel";

export function HighlightedListings({ rankings }: { rankings: MarketRankings }) {
  return (
    <TabbedPanel
      title="Imóveis em destaque"
      description="Os extremos do recorte, com link para o anúncio de origem."
      tabs={[
        {
          value: "expensive",
          label: "Mais caros",
          content: <ListingRows items={rankings.most_expensive_listings.items} />,
        },
        {
          value: "square-metre",
          label: "Maior R$/m²",
          content: <ListingRows items={rankings.highest_price_per_square_metre_listings.items} />,
        },
        {
          value: "cheapest",
          label: "Mais baratos",
          content: <ListingRows items={rankings.cheapest_listings.items} />,
        },
      ]}
    />
  );
}
