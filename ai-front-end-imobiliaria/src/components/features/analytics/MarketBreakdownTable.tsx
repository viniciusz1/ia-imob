"use client";

import { useMemo } from "react";
import { ChartColumn, SearchX } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { ShareBar } from "@/components/ui/charts";
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
import { EMPTY_VALUE, formatCount, formatCurrency } from "./format";

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
      icon={ChartColumn}
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
  // Bars compare each group with the largest one across all pages.
  const largestSample = Math.max(0, ...rows.map((row) => row.sampleSize));

  if (rows.length === 0) {
    return (
      <div>
        <EmptyState icon={SearchX} title="Sem imóveis neste recorte." variant="inline" />
        <PaginationFooter paged={paged} noun="grupos" />
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{groupLabel}</TableHead>
            <TableHead className="text-right">Imóveis</TableHead>
            <TableHead className="text-right">Mediana</TableHead>
            <TableHead className="text-right">R$/m²</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.pageItems.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium text-foreground">{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">
                <span className="inline-flex items-center justify-end gap-3">
                  <ShareBar className="hidden sm:inline-flex" max={largestSample} value={row.sampleSize} />
                  <span className="min-w-10 text-foreground">{formatCount(row.sampleSize)}</span>
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.insufficientSample ? EMPTY_VALUE : formatCurrency(row.median)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.insufficientSample
                  ? EMPTY_VALUE
                  : formatCurrency(row.medianPerSquareMetre)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaginationFooter paged={paged} noun="grupos" />
    </div>
  );
}
