"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  CalendarRange,
  ChartColumn,
  CheckCircle2,
  ClipboardList,
  ClipboardX,
  Coins,
  Ruler,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
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
    <div className="space-y-6">
      <PageHeader
        actions={
          data === undefined ? null : (
            <Badge variant="info">
              <CalendarClock aria-hidden />
              Última avaliação: {formatReferenceDate(data.meta.data_reference_date)}
            </Badge>
          )
        }
        description="Volume, resultado e valores das avaliações salvas pela sua imobiliária."
        title="Análise de avaliações"
      />

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader
          description="Considera as avaliações salvas dentro do intervalo escolhido."
          icon={CalendarRange}
          title="Período das avaliações"
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
          <FormField htmlFor="valuation-start-date" label="De">
            <DatePicker
              id="valuation-start-date"
              aria-label="Data inicial das avaliações"
              size="sm"
              value={period.data_inicio}
              onChange={(value) => setPeriod({ ...period, data_inicio: value })}
            />
          </FormField>
          <FormField htmlFor="valuation-end-date" label="Até">
            <DatePicker
              id="valuation-end-date"
              aria-label="Data final das avaliações"
              size="sm"
              value={period.data_fim}
              onChange={(value) => setPeriod({ ...period, data_fim: value })}
            />
          </FormField>
        </div>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isPending || indicators === undefined ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[7.5rem] w-full rounded-xl" />
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
              tone="success"
              value={`${formatCount(indicators.calculated.value)} (${formatShare(indicators.calculated_share.value)})`}
            />
            <StatTile
              icon={TriangleAlert}
              label="Amostra insuficiente"
              tone="warning"
              value={formatCount(indicators.insufficient_sample.value)}
            />
            <StatTile
              icon={Coins}
              label="Valor central mediano"
              tone="info"
              value={formatCurrency(indicators.median_value.value)}
            />
            <StatTile
              icon={TrendingUp}
              label="Valor central médio"
              tone="info"
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
          icon={ChartColumn}
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
    return (
      <div>
        <EmptyState icon={ClipboardX} title="Sem avaliações neste recorte." variant="inline" />
        <PaginationFooter paged={paged} noun="grupos" />
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="sm:pl-5">{groupLabel}</TableHead>
            <TableHead className={showMedian ? "text-right" : "text-right sm:pr-5"}>
              Avaliações
            </TableHead>
            {showMedian ? <TableHead className="text-right sm:pr-5">Valor mediano</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paged.pageItems.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="text-foreground sm:pl-5">{row.label}</TableCell>
              <TableCell
                className={
                  showMedian ? "text-right tabular-nums" : "text-right tabular-nums sm:pr-5"
                }
              >
                {formatCount(row.count)}
              </TableCell>
              {showMedian ? (
                <TableCell className="text-right tabular-nums sm:pr-5">
                  {row.medianValue == null ? EMPTY_VALUE : formatCurrency(row.medianValue)}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
