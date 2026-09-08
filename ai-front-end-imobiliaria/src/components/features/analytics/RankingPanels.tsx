import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarketRankings, NeighbourhoodRankingItem, RankedListing } from "@/types/analytics";
import { PanelCard } from "./PanelCard";
import { EMPTY_VALUE, formatCount, formatCurrency, formatSquareMetrePrice } from "./format";

export function RankingPanels({ rankings }: { rankings: MarketRankings }) {
  const extremes = rankings.neighbourhood_extremes;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <NeighbourhoodRanking
          indicator={rankings.neighbourhoods_by_price.indicator}
          title="Bairros mais caros por preço"
          items={rankings.neighbourhoods_by_price.items}
          format={formatCurrency}
        />
        <NeighbourhoodRanking
          indicator={rankings.neighbourhoods_by_square_metre.indicator}
          title="Bairros mais caros por m²"
          items={rankings.neighbourhoods_by_square_metre.items}
          format={formatSquareMetrePrice}
        />
      </div>

      <PanelCard indicator={extremes.indicator} title="Bairro mais caro e mais barato">
        <div className="grid gap-4 sm:grid-cols-2">
          <ExtremeNeighbourhood label="Mais caro" item={extremes.most_expensive} />
          <ExtremeNeighbourhood label="Mais barato" item={extremes.cheapest} />
        </div>
      </PanelCard>

      <ListingTable
        indicator={rankings.most_expensive_listings.indicator}
        title="Imóveis mais caros da região"
        items={rankings.most_expensive_listings.items}
      />
      <ListingTable
        indicator={rankings.highest_price_per_square_metre_listings.indicator}
        title="Imóveis com maior preço por m²"
        items={rankings.highest_price_per_square_metre_listings.items}
      />
      <ListingTable
        indicator={rankings.cheapest_listings.indicator}
        title="Imóveis mais baratos da região"
        items={rankings.cheapest_listings.items}
      />
    </div>
  );
}

function ExtremeNeighbourhood({
  label,
  item,
}: {
  label: string;
  item: NeighbourhoodRankingItem | null;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{item?.label ?? EMPTY_VALUE}</p>
      <p className="text-sm text-muted-foreground">
        {item === null
          ? "Nenhum bairro com amostra suficiente."
          : `${formatCurrency(item.median)} · ${formatCount(item.sample_size)} imóveis`}
      </p>
    </div>
  );
}

function NeighbourhoodRanking({
  indicator,
  title,
  items,
  format,
}: {
  indicator: string;
  title: string;
  items: NeighbourhoodRankingItem[];
  format: (value: number | null) => string;
}) {
  return (
    <PanelCard indicator={indicator} title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum bairro atingiu a amostra mínima de cinco imóveis.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Mediana</TableHead>
              <TableHead>Amostra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.label}>
                <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                <TableCell>{item.label}</TableCell>
                <TableCell className="tabular-nums">{format(item.median)}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatCount(item.sample_size)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PanelCard>
  );
}

function ListingTable({
  indicator,
  title,
  items,
}: {
  indicator: string;
  title: string;
  items: RankedListing[];
}) {
  return (
    <PanelCard indicator={indicator} title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Área</TableHead>
            <TableHead>Por m²</TableHead>
            <TableHead>Bairro</TableHead>
            <TableHead>Imobiliária</TableHead>
            <TableHead>Anúncio</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell className="text-muted-foreground" colSpan={7}>
                Sem imóveis neste recorte.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.type}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(item.price)}</TableCell>
                <TableCell className="tabular-nums">
                  {item.area === null ? EMPTY_VALUE : `${formatCount(item.area)} m²`}
                </TableCell>
                <TableCell className="tabular-nums">
                  {formatSquareMetrePrice(item.price_per_square_metre)}
                </TableCell>
                <TableCell>{item.neighbourhood ?? EMPTY_VALUE}</TableCell>
                <TableCell>{item.agency ?? EMPTY_VALUE}</TableCell>
                <TableCell>
                  {item.listing_url === null ? (
                    EMPTY_VALUE
                  ) : (
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={item.listing_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </PanelCard>
  );
}
