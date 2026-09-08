import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarketPricing, PriceByGroupItem } from "@/types/analytics";
import { PanelCard } from "./PanelCard";
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
      <PanelCard
        indicator={pricing.dispersion_by_neighbourhood.indicator}
        title="Variação de preço no bairro"
        className="lg:col-span-2"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bairro</TableHead>
              <TableHead>Variação</TableHead>
              <TableHead>Amostra</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pricing.dispersion_by_neighbourhood.items.slice(0, 12).map((item) => (
              <TableRow key={item.label}>
                <TableCell>{item.label}</TableCell>
                <TableCell className="tabular-nums">
                  {item.insufficient_sample ? EMPTY_VALUE : formatShare(item.variation)}
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {formatCount(item.sample_size)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </PanelCard>
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
    <PanelCard indicator={indicator} title={title}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{groupLabel}</TableHead>
            <TableHead>Mediana</TableHead>
            {showSquareMetre ? <TableHead>Por m²</TableHead> : null}
            <TableHead>Amostra</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.label}>
              <TableCell>{item.label}</TableCell>
              <TableCell className="tabular-nums">
                {item.insufficient_sample ? EMPTY_VALUE : formatCurrency(item.median)}
              </TableCell>
              {showSquareMetre ? (
                <TableCell className="tabular-nums">
                  {formatSquareMetrePrice(item.median_per_square_metre)}
                </TableCell>
              ) : null}
              <TableCell className="tabular-nums text-muted-foreground">
                {formatCount(item.sample_size)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PanelCard>
  );
}
