import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MarketOverview } from "@/types/analytics";
import { DistributionBars } from "./DistributionBars";
import { FIELD_LABELS, formatCount, formatShare } from "./format";

export function SupplyPanels({ overview }: { overview: MarketOverview }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <DistributionBars
          indicator={overview.by_city.indicator}
          title="Imóveis por cidade"
          items={overview.by_city.items}
        />
        <DistributionBars
          indicator={overview.by_neighbourhood.indicator}
          title="Imóveis por bairro"
          items={overview.by_neighbourhood.items}
        />
        <DistributionBars
          indicator={overview.by_type.indicator}
          title="Imóveis por tipo"
          items={overview.by_type.items}
        />
        <DistributionBars
          indicator={overview.by_agency.indicator}
          title="Participação por imobiliária"
          items={overview.by_agency.items}
        />
        <DistributionBars
          indicator={overview.by_price_range.indicator}
          title="Distribuição por faixa de preço"
          items={overview.by_price_range.items}
        />
        <DistributionBars
          indicator={overview.by_area_range.indicator}
          title="Distribuição por faixa de área"
          items={overview.by_area_range.items}
        />
        <DistributionBars
          indicator={overview.by_bedrooms.indicator}
          title="Distribuição por quartos"
          items={overview.by_bedrooms.items}
        />
        <DistributionBars
          indicator={overview.by_parking_spaces.indicator}
          title="Distribuição por vagas"
          items={overview.by_parking_spaces.items}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-baseline justify-between text-sm font-medium">
            <span>Preenchimento dos campos</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {overview.field_completeness.indicator}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.field_completeness.items.map((item) => (
            <div key={item.field} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span>{FIELD_LABELS[item.field] ?? item.field}</span>
                <span className="tabular-nums text-muted-foreground">
                  {formatShare(item.share)} · {formatCount(item.filled)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${item.share * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
