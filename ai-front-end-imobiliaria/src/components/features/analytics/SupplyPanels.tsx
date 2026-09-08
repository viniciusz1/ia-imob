import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { MarketOverview } from "@/types/analytics";
import { DistributionBars } from "./DistributionBars";
import { TabbedPanel } from "./TabbedPanel";
import { FIELD_LABELS, formatCount, formatShare } from "./format";

export function SupplyPanels({ overview }: { overview: MarketOverview }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <TabbedPanel
          title="Onde está a oferta"
          description="Distribuição dos imóveis por região."
          tabs={[
            {
              value: "city",
              label: "Cidade",
              content: <DistributionBars items={overview.by_city.items} />,
            },
            {
              value: "neighbourhood",
              label: "Bairro",
              content: <DistributionBars items={overview.by_neighbourhood.items} />,
            },
            {
              value: "agency",
              label: "Imobiliária",
              content: <DistributionBars items={overview.by_agency.items} />,
            },
          ]}
        />

        <TabbedPanel
          title="Perfil dos imóveis"
          description="Como a oferta se divide por tipo, preço, área e características."
          tabs={[
            {
              value: "type",
              label: "Tipo",
              content: <DistributionBars items={overview.by_type.items} />,
            },
            {
              value: "price",
              label: "Preço",
              content: <DistributionBars items={overview.by_price_range.items} />,
            },
            {
              value: "area",
              label: "Área",
              content: <DistributionBars items={overview.by_area_range.items} />,
            },
            {
              value: "bedrooms",
              label: "Quartos",
              content: <DistributionBars items={overview.by_bedrooms.items} />,
            },
            {
              value: "parking",
              label: "Vagas",
              content: <DistributionBars items={overview.by_parking_spaces.items} />,
            },
          ]}
        />
      </div>

      <Accordion type="single" collapsible className="rounded-xl border bg-card px-6">
        <AccordionItem value="completeness" className="border-b-0">
          <AccordionTrigger className="text-sm">
            Qualidade dos dados: preenchimento dos campos
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-4 pb-2 sm:grid-cols-2 lg:grid-cols-3">
              {overview.field_completeness.items.map((item) => (
                <div key={item.field} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
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
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </>
  );
}
