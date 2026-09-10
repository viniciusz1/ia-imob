"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DispersionItem, MarketPricing, PriceByGroupItem } from "@/types/analytics";
import { PaginationFooter, usePagedItems } from "./PagedList";
import { TabbedPanel } from "./TabbedPanel";
import { EMPTY_VALUE, formatCount, formatCurrency, formatShare, formatSquareMetrePrice } from "./format";

export function PricingPanels({ pricing }: { pricing: MarketPricing }) {
  return (
    <TabbedPanel
      title="Preço por recorte"
      description="Mediana calculada dentro de cada grupo, com a amostra que a sustenta."
      tabs={[
        {
          value: "type",
          label: "Por tipo",
          content: <PriceByGroupTable groupLabel="Tipo" items={pricing.by_type.items} showSquareMetre />,
        },
        {
          value: "bedrooms",
          label: "Por quartos",
          content: <PriceByGroupTable groupLabel="Quartos" items={pricing.by_bedrooms.items} />,
        },
        {
          value: "dispersion",
          label: "Variação por bairro",
          content: <DispersionTable items={pricing.dispersion_by_neighbourhood.items} />,
        },
      ]}
    />
  );
}

function PriceByGroupTable({
  groupLabel,
  items,
  showSquareMetre = false,
}: {
  groupLabel: string;
  items: PriceByGroupItem[];
  showSquareMetre?: boolean;
}) {
  const paged = usePagedItems(items);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem imóveis neste recorte.</p>;
  }

  return (
    <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{groupLabel}</TableHead>
          <TableHead className="text-right">Mediana</TableHead>
          {showSquareMetre ? <TableHead className="text-right">Por m²</TableHead> : null}
          <TableHead className="text-right">Amostra</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paged.pageItems.map((item) => (
          <TableRow key={item.label}>
            <TableCell className="font-medium">{item.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {item.insufficient_sample ? EMPTY_VALUE : formatCurrency(item.median)}
            </TableCell>
            {showSquareMetre ? (
              <TableCell className="text-right tabular-nums">
                {formatSquareMetrePrice(item.median_per_square_metre)}
              </TableCell>
            ) : null}
            <TableCell className="text-right tabular-nums text-muted-foreground">
              {formatCount(item.sample_size)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    <PaginationFooter paged={paged} noun="grupos" />
    </div>
  );
}

function DispersionTable({ items }: { items: DispersionItem[] }) {
  const paged = usePagedItems(items);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem bairros neste recorte.</p>;
  }

  return (
    <div>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Bairro</TableHead>
          <TableHead className="text-right">Variação</TableHead>
          <TableHead className="text-right">Amostra</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paged.pageItems.map((item) => (
          <TableRow key={item.label}>
            <TableCell className="font-medium">{item.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {item.insufficient_sample ? EMPTY_VALUE : formatShare(item.variation)}
            </TableCell>
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
