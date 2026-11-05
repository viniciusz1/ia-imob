"use client";

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
import type { AuctionAnalytics, AuctionGroupItem } from "@/types/analytics";
import { PaginationFooter, usePagedItems } from "./PagedList";
import { TabbedPanel } from "./TabbedPanel";
import { formatCount, formatCurrency, formatShare } from "./format";

interface AuctionBreakdownTableProps {
  analytics: AuctionAnalytics;
}

export function AuctionBreakdownTable({ analytics }: AuctionBreakdownTableProps) {
  return (
    <TabbedPanel
      description="Quantos lotes cada recorte tem, o desconto típico e quantos estão abaixo do valor de mercado estimado."
      icon={ChartColumn}
      tabs={[
        {
          value: "modality",
          label: "Modalidade",
          content: <BreakdownTab items={analytics.by_modality.items} label="Modalidade" />,
        },
        {
          value: "type",
          label: "Tipo",
          content: <BreakdownTab items={analytics.by_type.items} label="Tipo" />,
        },
        {
          value: "neighbourhood",
          label: "Bairro",
          content: <BreakdownTab items={analytics.by_neighbourhood.items} label="Bairro" />,
        },
      ]}
      title="Leilões por recorte"
    />
  );
}

function BreakdownTab({ items, label }: { items: AuctionGroupItem[]; label: string }) {
  const paged = usePagedItems(items);

  if (items.length === 0) {
    return (
      <EmptyState
        description="Nenhum lote do inventário atende aos filtros escolhidos."
        icon={SearchX}
        title="Sem lotes no filtro"
        variant="inline"
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{label}</TableHead>
              <TableHead className="text-right">Lotes</TableHead>
              <TableHead className="text-right">Lance mínimo mediano</TableHead>
              <TableHead className="text-right">Desconto mediano</TableHead>
              <TableHead className="w-48">Abaixo do mercado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.pageItems.map((item) => (
              <TableRow key={item.label}>
                <TableCell className="font-medium">{item.label}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(item.count)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(item.median_minimum_bid)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatShare(item.median_discount)}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <ShareBar max={item.count} tone="success" value={item.below_market} />
                    <span className="text-xs tabular-nums text-subtle">
                      {formatCount(item.below_market)} de {formatCount(item.count)}
                    </span>
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationFooter noun="grupos" paged={paged} />
    </>
  );
}
