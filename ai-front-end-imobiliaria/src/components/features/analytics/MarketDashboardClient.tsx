"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, CalendarClock, Coins, Ruler, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getMarketOverview,
  getMarketPricing,
  getMarketRankings,
} from "@/services/marketAnalyticsService";
import type { MarketAnalyticsFilters } from "@/types/analytics";
import { StatTile } from "./StatTile";
import { MarketBreakdownTable } from "./MarketBreakdownTable";
import { MarketFiltersPanel } from "./MarketFiltersPanel";
import {
  formatCount,
  formatCurrency,
  formatReferenceDate,
} from "./format";
import { useMarketAnalyticsFilters } from "./useMarketAnalyticsFilters";

/** Teto que a API aceita em `limite`; cobre todo bairro com amostra suficiente. */
const NEIGHBOURHOOD_LIMIT = 50;

export function MarketDashboardClient() {
  const { filters, setFilters } = useMarketAnalyticsFilters();
  // The inputs follow the URL instantly; the requests wait for a pause in
  // typing (price, area) so each keystroke doesn't become three requests.
  const key = useDebouncedValue(queryKeyFor(filters));
  const requested = useMemo(() => JSON.parse(key) as MarketAnalyticsFilters, [key]);

  // keepPreviousData: changing a filter keeps the numbers on screen until the
  // new ones arrive instead of flashing back to skeletons.
  const overview = useQuery({
    queryKey: ["market-analytics", "overview", key],
    queryFn: () => getMarketOverview(requested),
    placeholderData: keepPreviousData,
  });
  const pricing = useQuery({
    queryKey: ["market-analytics", "pricing", key],
    queryFn: () => getMarketPricing(requested),
    placeholderData: keepPreviousData,
  });
  const rankings = useQuery({
    queryKey: ["market-analytics", "rankings", key],
    queryFn: () => getMarketRankings(requested, NEIGHBOURHOOD_LIMIT),
    placeholderData: keepPreviousData,
  });
  const isRefreshing =
    (overview.isPlaceholderData || pricing.isPlaceholderData || rankings.isPlaceholderData) &&
    (overview.isFetching || pricing.isFetching || rankings.isFetching);

  const meta = overview.data?.meta ?? pricing.data?.meta ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          meta === null ? null : (
            <Badge variant="info">
              <CalendarClock aria-hidden />
              Coleta de referência: {formatReferenceDate(meta.data_reference_date)}
            </Badge>
          )
        }
        description="Estoque, preços e rankings da coleta publicada mais recente de cada imobiliária."
        title="Análise de mercado"
      />

      <MarketFiltersPanel filters={filters} onChange={setFilters} />

      <section
        aria-busy={isRefreshing}
        className={cn("grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-4", isRefreshing && "opacity-60")}
      >
        {overview.isPending || pricing.isPending ? (
          <PanelSkeleton count={4} className="h-[7.5rem]" />
        ) : (
          <>
            <StatTile
              icon={Building2}
              label="Imóveis em oferta"
              value={formatCount(overview.data?.data.total_supply.value)}
            />
            <StatTile
              icon={Coins}
              label="Preço mediano"
              tone="success"
              value={formatCurrency(pricing.data?.data.median_price.value)}
              insufficientSample={pricing.data?.data.median_price.insufficient_sample}
            />
            <StatTile
              icon={TrendingUp}
              label="Preço médio"
              tone="info"
              value={formatCurrency(pricing.data?.data.average_price.value)}
              insufficientSample={pricing.data?.data.average_price.insufficient_sample}
            />
            <StatTile
              icon={Ruler}
              label="Preço mediano por m²"
              value={formatCurrency(pricing.data?.data.median_price_per_square_metre.value)}
              insufficientSample={
                pricing.data?.data.median_price_per_square_metre.insufficient_sample
              }
            />
          </>
        )}
      </section>

      {pricing.data && rankings.data ? (
        <div aria-busy={isRefreshing} className={cn("transition-opacity duration-200", isRefreshing && "opacity-60")}>
          <MarketBreakdownTable pricing={pricing.data.data} rankings={rankings.data.data} />
        </div>
      ) : (
        <PanelSkeleton count={1} />
      )}
    </div>
  );
}

function PanelSkeleton({ count, className = "h-72" }: { count: number; className?: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className={cn("w-full rounded-xl", className)} />
      ))}
    </>
  );
}

function queryKeyFor(filters: MarketAnalyticsFilters): string {
  return JSON.stringify(filters);
}
