import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketRankings, NeighbourhoodRankingItem, RankedListing } from "@/types/analytics";
import { EMPTY_VALUE, formatCount, formatCurrency, formatSquareMetrePrice } from "./format";

export function RankingPanels({ rankings }: { rankings: MarketRankings }) {
  const extremes = rankings.neighbourhood_extremes;

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-baseline justify-between text-sm font-medium">
            <span>Bairro mais caro e mais barato</span>
            <span className="text-xs tabular-nums text-muted-foreground">{extremes.indicator}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ExtremeNeighbourhood label="Mais caro" item={extremes.most_expensive} />
          <ExtremeNeighbourhood label="Mais barato" item={extremes.cheapest} />
        </CardContent>
      </Card>

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
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{item?.label ?? EMPTY_VALUE}</p>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-baseline justify-between text-sm font-medium">
          <span>{title}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{indicator}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum bairro atingiu a amostra mínima de cinco imóveis.
          </p>
        ) : (
          items.map((item, index) => (
            <div key={item.label} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">
                <span className="mr-2 tabular-nums text-muted-foreground">{index + 1}.</span>
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums">
                {format(item.median)}
                <span className="ml-2 text-muted-foreground">n={item.sample_size}</span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-baseline justify-between text-sm font-medium">
          <span>{title}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{indicator}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Valor</th>
                <th className="py-2 pr-4 font-medium">Área</th>
                <th className="py-2 pr-4 font-medium">Por m²</th>
                <th className="py-2 pr-4 font-medium">Bairro</th>
                <th className="py-2 pr-4 font-medium">Imobiliária</th>
                <th className="py-2 font-medium">Anúncio</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="py-3 text-muted-foreground" colSpan={7}>
                    Sem imóveis neste recorte.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="py-2 pr-4">{item.type}</td>
                    <td className="py-2 pr-4 tabular-nums">{formatCurrency(item.price)}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {item.area === null ? EMPTY_VALUE : `${formatCount(item.area)} m²`}
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      {formatSquareMetrePrice(item.price_per_square_metre)}
                    </td>
                    <td className="py-2 pr-4">{item.neighbourhood ?? EMPTY_VALUE}</td>
                    <td className="py-2 pr-4">{item.agency ?? EMPTY_VALUE}</td>
                    <td className="py-2">
                      {item.listing_url === null ? (
                        EMPTY_VALUE
                      ) : (
                        <a
                          className="text-primary underline-offset-4 hover:underline"
                          href={item.listing_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          abrir
                        </a>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
