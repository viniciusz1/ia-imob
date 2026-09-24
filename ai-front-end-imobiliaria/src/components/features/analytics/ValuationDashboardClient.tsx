"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardList, Coins, Ruler, TrendingUp, TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getValuationAnalytics } from "@/services/marketAnalyticsService";
import type { ValuationGroupItem } from "@/types/analytics";
import { PaginationFooter, usePagedItems } from "./PagedList";
import { StatTile } from "./StatTile";
import { TabbedPanel } from "./TabbedPanel";
import {
  EMPTY_VALUE,
  formatCount,
  formatCurrency,
  formatReferenceDate,
  formatShare,
  formatSquareMetrePrice,
} from "./format";

interface ValuationRow {
  label: string;
  count: number;
  medianValue?: number | null;
}

export function ValuationDashboardClient() {
  const [period, setPeriod] = useState({ data_inicio: "", data_fim: "" });

  const { data, isPending } = useQuery({
    queryKey: ["valuation-analytics", period],
    queryFn: () => getValuationAnalytics(period),
  });

  const indicators = data?.data;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise de avaliações</h1>
          <p className="text-muted-foreground mt-1">
            Volume, resultado e valores das avaliações salvas pela sua imobiliária.
          </p>
        </div>
        {data === undefined ? null : (
          <p className="shrink-0 text-sm text-muted-foreground">
            Última avaliação: {formatReferenceDate(data.meta.data_reference_date)}
          </p>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="space-y-2">
            <Label htmlFor="valuation-start-date">Período das avaliações</Label>
            <Input
              id="valuation-start-date"
              aria-label="Data inicial das avaliações"
              type="date"
              value={period.data_inicio}
              onChange={(event) => setPeriod({ ...period, data_inicio: event.target.value })}
            />
          </div>
          <Input
            aria-label="Data final das avaliações"
            className="sm:w-auto"
            type="date"
            value={period.data_fim}
            onChange={(event) => setPeriod({ ...period, data_fim: event.target.value })}
          />
        </CardContent>
      </Card>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isPending || indicators === undefined ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatTile
              icon={ClipboardList}
              label="Avaliações realizadas"
              value={formatCount(indicators.total.value)}
            />
            <StatTile
              icon={CheckCircle2}
              label="Calculadas"
              value={`${formatCount(indicators.calculated.value)} (${formatShare(indicators.calculated_share.value)})`}
            />
            <StatTile
              icon={TriangleAlert}
              label="Amostra insuficiente"
              value={formatCount(indicators.insufficient_sample.value)}
            />
            <StatTile
              icon={Coins}
              label="Valor central mediano"
              value={formatCurrency(indicators.median_value.value)}
            />
            <StatTile
              icon={TrendingUp}
              label="Valor central médio"
              value={formatCurrency(indicators.average_value.value)}
            />
            <StatTile
              icon={Ruler}
              label="Valor mediano por m²"
              value={formatSquareMetrePrice(indicators.median_price_per_square_metre.value)}
            />
          </>
        )}
      </section>

      {indicators === undefined ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : (
        <TabbedPanel
          title="Avaliações por recorte"
          description="Quantidade de avaliações em cada grupo e mediana do valor central das que foram calculadas."
          tabs={[
            {
              value: "type",
              label: "Tipo",
              content: <ValuationRows rows={groupRows(indicators.by_type.items)} groupLabel="Tipo" />,
            },
            {
              value: "neighbourhood",
              label: "Bairro",
              content: (
                <ValuationRows rows={groupRows(indicators.by_neighbourhood.items)} groupLabel="Bairro" />
              ),
            },
            {
              value: "user",
              label: "Avaliador",
              content: (
                <ValuationRows rows={groupRows(indicators.by_user.items)} groupLabel="Avaliador" />
              ),
            },
            {
              value: "month",
              label: "Mês",
              content: (
                <ValuationRows
                  rows={indicators.by_month.items.map((item) => ({
                    label: formatMonth(item.label),
                    count: item.count,
                  }))}
                  groupLabel="Mês"
                />
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

function ValuationRows({ rows, groupLabel }: { rows: ValuationRow[]; groupLabel: string }) {
  const paged = usePagedItems(rows);
  const showMedian = rows.some((row) => row.medianValue !== undefined);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem avaliações neste recorte.</p>;
  }

  return (
    <div>
      <div className="-mx-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">{groupLabel}</TableHead>
              <TableHead className={showMedian ? "text-right" : "pr-6 text-right"}>
                Avaliações
              </TableHead>
              {showMedian ? <TableHead className="pr-6 text-right">Valor mediano</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.pageItems.map((row) => (
              <TableRow key={row.label}>
                <TableCell className="pl-6 font-medium">{row.label}</TableCell>
                <TableCell
                  className={
                    showMedian ? "text-right tabular-nums" : "pr-6 text-right tabular-nums"
                  }
                >
                  {formatCount(row.count)}
                </TableCell>
                {showMedian ? (
                  <TableCell className="pr-6 text-right tabular-nums">
                    {row.medianValue == null ? EMPTY_VALUE : formatCurrency(row.medianValue)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginationFooter paged={paged} noun="grupos" />
    </div>
  );
}

function groupRows(items: ValuationGroupItem[]): ValuationRow[] {
  return items.map((item) => ({
    label: item.label,
    count: item.count,
    medianValue: item.median_value,
  }));
}

/** "2026-09" → "set/2026". */
function formatMonth(value: string): string {
  const [year, month] = value.split("-").map(Number);

  const label = new Intl.DateTimeFormat("pt-BR", { month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)))
    .replace(".", "");

  return `${label}/${year}`;
}
