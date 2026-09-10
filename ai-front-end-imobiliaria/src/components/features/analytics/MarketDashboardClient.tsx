"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Coins, Ruler, TrendingUp } from "lucide-react";
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
  formatSquareMetrePrice,
} from "./format";
import { useMarketAnalyticsFilters } from "./useMarketAnalyticsFilters";

/** Teto que a API aceita em `limite`; cobre todo bairro com amostra suficiente. */
const NEIGHBOURHOOD_LIMIT = 50;

export function MarketDashboardClient() {
  const { filters, setFilters } = useMarketAnalyticsFilters();
  const key = queryKeyFor(filters);

  const overview = useQuery({
    queryKey: ["market-analytics", "overview", key],
    queryFn: () => getMarketOverview(filters),
  });
  const pricing = useQuery({
    queryKey: ["market-analytics", "pricing", key],
    queryFn: () => getMarketPricing(filters),
  });
  const rankings = useQuery({
    queryKey: ["market-analytics", "rankings", key],
    queryFn: () => getMarketRankings(filters, NEIGHBOURHOOD_LIMIT),
  });

  const meta = overview.data?.meta ?? pricing.data?.meta ?? null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise de mercado</h1>
          <p className="text-muted-foreground mt-1">
            Estoque, preços e rankings da coleta publicada mais recente de cada imobiliária.
          </p>
        </div>
        {meta === null ? null : (
          <p className="shrink-0 text-sm text-muted-foreground">
            Coleta de referência: {formatReferenceDate(meta.data_reference_date)}
          </p>
        )}
      </div>

      <MarketFiltersPanel filters={filters} onChange={setFilters} />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.isPending || pricing.isPending ? (
          <PanelSkeleton count={4} className="h-24" />
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
              value={formatCurrency(pricing.data?.data.median_price.value)}
              insufficientSample={pricing.data?.data.median_price.insufficient_sample}
            />
            <StatTile
              icon={TrendingUp}
              label="Preço médio"
              value={formatCurrency(pricing.data?.data.average_price.value)}
              insufficientSample={pricing.data?.data.average_price.insufficient_sample}
            />
            <StatTile
              icon={Ruler}
              label="Preço mediano por m²"
              value={formatSquareMetrePrice(
                pricing.data?.data.median_price_per_square_metre.value,
              )}
              insufficientSample={
                pricing.data?.data.median_price_per_square_metre.insufficient_sample
              }
            />
          </>
        )}
      </section>

      {pricing.data && rankings.data ? (
        <MarketBreakdownTable pricing={pricing.data.data} rankings={rankings.data.data} />
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




