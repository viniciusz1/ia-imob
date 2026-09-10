"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarketRankings, NeighbourhoodRankingItem } from "@/types/analytics";
import { ListingRows } from "./ListingRows";
import { PaginationFooter, usePagedItems } from "./PagedList";
import { TabbedPanel } from "./TabbedPanel";
import { formatCount, formatCurrency, formatSquareMetrePrice } from "./format";

export function RankingPanels({ rankings }: { rankings: MarketRankings }) {
  const extremes = rankings.neighbourhood_extremes;
  const extremesDescription =
    extremes.most_expensive === null || extremes.cheapest === null
      ? undefined
      : `Mais caro: ${extremes.most_expensive.label} (${formatCurrency(extremes.most_expensive.median)}) · Mais barato: ${extremes.cheapest.label} (${formatCurrency(extremes.cheapest.median)})`;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TabbedPanel
        title="Bairros mais caros"
        description={extremesDescription}
        tabs={[
          {
            value: "price",
            label: "Por preço",
            content: (
              <NeighbourhoodRanking
                items={rankings.neighbourhoods_by_price.items}
                format={formatCurrency}
              />
            ),
          },
          {
            value: "square-metre",
            label: "Por m²",
            content: (
              <NeighbourhoodRanking
                items={rankings.neighbourhoods_by_square_metre.items}
                format={formatSquareMetrePrice}
              />
            ),
          },
        ]}
      />

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
            content: (
              <ListingRows items={rankings.highest_price_per_square_metre_listings.items} />
            ),
          },
          {
            value: "cheapest",
            label: "Mais baratos",
            content: <ListingRows items={rankings.cheapest_listings.items} />,
          },
        ]}
      />
    </div>
  );
}

function NeighbourhoodRanking({
  items,
  format,
}: {
  items: NeighbourhoodRankingItem[];
  format: (value: number | null) => string;
}) {
  const paged = usePagedItems(items);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum bairro atingiu a amostra mínima de cinco imóveis.
      </p>
    );
  }

  return (
    <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Bairro</TableHead>
          <TableHead className="text-right">Mediana</TableHead>
          <TableHead className="text-right">Amostra</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paged.pageItems.map((item, index) => (
          <TableRow key={item.label}>
            <TableCell className="tabular-nums text-muted-foreground">
              {paged.firstIndex + index + 1}
            </TableCell>
            <TableCell className="font-medium">{item.label}</TableCell>
            <TableCell className="text-right tabular-nums">{format(item.median)}</TableCell>
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {formatCount(item.sample_size)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <PaginationFooter paged={paged} noun="bairros" />
    </div>
  );
}
