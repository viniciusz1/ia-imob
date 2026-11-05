"use client";

import { ExternalLink, SearchX, Gavel } from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuctionOpportunity } from "@/types/analytics";
import { PaginationFooter, usePagedItems } from "./PagedList";
import { EMPTY_VALUE, formatCurrency, formatShare } from "./format";

interface AuctionOpportunitiesTableProps {
  items: AuctionOpportunity[];
}

/**
 * Lotes ordenados pela diferença entre o lance mínimo e o valor que o mercado
 * pede na mesma região; sem mercado para comparar vale o desconto da avaliação.
 */
export function AuctionOpportunitiesTable({ items }: AuctionOpportunitiesTableProps) {
  const paged = usePagedItems(items);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <SectionHeader
        description="Diferença entre o lance mínimo, a avaliação judicial e o valor estimado pelo mercado da região."
        icon={Gavel}
        title="Oportunidades encontradas"
      />

      {items.length === 0 ? (
        <EmptyState
          description="Nenhum lote do filtro atual está abaixo da avaliação ou do valor de mercado estimado."
          icon={SearchX}
          title="Sem oportunidades no filtro"
          variant="inline"
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lote</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead className="text-right">Lance mínimo</TableHead>
                  <TableHead className="text-right">Avaliação</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Estimado no mercado</TableHead>
                  <TableHead className="text-right">Abaixo do mercado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.pageItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-72">
                      <span className="block truncate font-medium" title={item.title}>
                        {item.url === null ? (
                          item.title
                        ) : (
                          <a
                            className="inline-flex items-center gap-1 hover:underline"
                            href={item.url}
                            rel="noreferrer noopener"
                            target="_blank"
                          >
                            {item.title}
                            <ExternalLink aria-hidden className="size-3.5 shrink-0" />
                          </a>
                        )}
                      </span>
                      <span className="block truncate text-xs text-subtle">
                        {[item.type, item.neighbourhood, item.city].filter(Boolean).join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell>{item.modality}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.minimum_bid)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.appraisal_value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatShare(item.discount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.market_estimate)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.market_gap === null ? (
                        <span className="tabular-nums text-muted-foreground">{EMPTY_VALUE}</span>
                      ) : (
                        <Badge variant={item.market_gap > 0 ? "success" : "muted"}>
                          {formatShare(item.market_gap)}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationFooter noun="lotes" paged={paged} />
        </>
      )}
    </Card>
  );
}
