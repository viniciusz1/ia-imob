import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketPricing, PriceByGroupItem } from "@/types/analytics";
import { EMPTY_VALUE, formatCount, formatCurrency, formatShare, formatSquareMetrePrice } from "./format";

export function PricingPanels({ pricing }: { pricing: MarketPricing }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PriceByGroupTable
        indicator={pricing.by_type.indicator}
        title="Preço mediano por tipo"
        groupLabel="Tipo"
        items={pricing.by_type.items}
        showSquareMetre
      />
      <PriceByGroupTable
        indicator={pricing.by_bedrooms.indicator}
        title="Preço mediano por quartos"
        groupLabel="Quartos"
        items={pricing.by_bedrooms.items}
      />
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-baseline justify-between text-sm font-medium">
            <span>Variação de preço no bairro</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {pricing.dispersion_by_neighbourhood.indicator}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Bairro</th>
                  <th className="py-2 pr-4 font-medium">Variação</th>
                  <th className="py-2 font-medium">Amostra</th>
                </tr>
              </thead>
              <tbody>
                {pricing.dispersion_by_neighbourhood.items.slice(0, 12).map((item) => (
                  <tr key={item.label} className="border-t">
                    <td className="py-2 pr-4">{item.label}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {item.insufficient_sample ? EMPTY_VALUE : formatShare(item.variation)}
                    </td>
                    <td className="py-2 tabular-nums text-muted-foreground">
                      {formatCount(item.sample_size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PriceByGroupTableProps {
  indicator: string;
  title: string;
  groupLabel: string;
  items: PriceByGroupItem[];
  showSquareMetre?: boolean;
}

function PriceByGroupTable({
  indicator,
  title,
  groupLabel,
  items,
  showSquareMetre = false,
}: PriceByGroupTableProps) {
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
                <th className="py-2 pr-4 font-medium">{groupLabel}</th>
                <th className="py-2 pr-4 font-medium">Mediana</th>
                {showSquareMetre ? <th className="py-2 pr-4 font-medium">Por m²</th> : null}
                <th className="py-2 font-medium">Amostra</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.label} className="border-t">
                  <td className="py-2 pr-4">{item.label}</td>
                  <td className="py-2 pr-4 tabular-nums">
                    {item.insufficient_sample ? EMPTY_VALUE : formatCurrency(item.median)}
                  </td>
                  {showSquareMetre ? (
                    <td className="py-2 pr-4 tabular-nums">
                      {formatSquareMetrePrice(item.median_per_square_metre)}
                    </td>
                  ) : null}
                  <td className="py-2 tabular-nums text-muted-foreground">
                    {formatCount(item.sample_size)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
