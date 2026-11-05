"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MarketPricing, MarketRankings } from "@/types/analytics";
import { PaginationFooter, usePagedItems } from "./PagedList";
import { TabbedPanel } from "./TabbedPanel";
import { EMPTY_VALUE, formatCount, formatCurrency, formatSquareMetrePrice } from "./format";

interface BreakdownRow {
  label: string;
  sampleSize: number;
  median: number | null;
  medianPerSquareMetre: number | null;
  insufficientSample: boolean;
}

interface MarketBreakdownTableProps {
  pricing: MarketPricing;
  rankings: MarketRankings;
}

export function MarketBreakdownTable({ pricing, rankings }: MarketBreakdownTableProps) {
  // The neighbourhood ranking by price and the one by square metre are two
  // separate rankings, so pair them by label instead of by position.
  const squareMetreByNeighbourhood = useMemo(() => {
    const index = new Map<string, number | null>();

    rankings.neighbourhoods_by_square_metre.items.forEach((item) => {
      index.set(item.label, item.median);
    });

    return index;
  }, [rankings.neighbourhoods_by_square_metre.items]);

  const byType: BreakdownRow[] = pricing.by_type.items.map((item) => ({
    label: item.label,
    sampleSize: item.sample_size,
    median: item.median,
    medianPerSquareMetre: item.median_per_square_metre,
    insufficientSample: item.insufficient_sample,
  }));

  const byBedrooms: BreakdownRow[] = pricing.by_bedrooms.items.map((item) => ({
    label: item.label,
    sampleSize: item.sample_size,
    median: item.median,
    medianPerSquareMetre: item.median_per_square_metre,
    insufficientSample: item.insufficient_sample,
  }));

  const byNeighbourhood: BreakdownRow[] = rankings.neighbourhoods_by_price.items.map((item) => ({
    label: item.label,
    sampleSize: item.sample_size,
    median: item.median,
    medianPerSquareMetre: squareMetreByNeighbourhood.get(item.label) ?? null,
    insufficientSample: false,
  }));

  return (
    <TabbedPanel
      title="Preço por recorte"
      description="Mediana calculada dentro de cada grupo. Imóveis conta os anúncios com preço válido que sustentam a mediana."
      tabs={[
        { value: "type", label: "Tipo", content: <BreakdownRows rows={byType} groupLabel="Tipo" /> },
        {
          value: "bedrooms",
          label: "Quartos",
          content: <BreakdownRows rows={byBedrooms} groupLabel="Quartos" />,
        },
        {
          value: "neighbourhood",
          label: "Bairro",
          content: <BreakdownRows rows={byNeighbourhood} groupLabel="Bairro" />,
        },
      ]}
    />
  );
}

function BreakdownRows({ rows, groupLabel }: { rows: BreakdownRow[]; groupLabel: string }) {
  const paged = usePagedItems(rows);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem imóveis neste recorte.</p>;
  }

  return (
    <div>
      {/* CardContent recua 24px de cada lado, o que deixava as divisórias das
          linhas paradas antes da borda do card. A sangria negativa devolve a
          largura à tabela e o recuo volta nas células das pontas. */}
      <div className="-mx-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">{groupLabel}</TableHead>
              <TableHead className="text-right">Imóveis</TableHead>
              <TableHead className="text-right">Mediana</TableHead>
              <TableHead className="pr-6 text-right">R$/m²</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.pageItems.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="pl-6 font-medium">{row.label}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatCount(row.sampleSize)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.insufficientSample ? EMPTY_VALUE : formatCurrency(row.median)}
                </TableCell>
                <TableCell className="pr-6 text-right tabular-nums">
                  {row.insufficientSample
                    ? EMPTY_VALUE
                    : formatSquareMetrePrice(row.medianPerSquareMetre)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationFooter paged={paged} noun="grupos" />
    </div>
  );
}
