"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMarketOverview,
  getMarketPricing,
  getMarketRankings,
} from "@/services/marketAnalyticsService";
import type { MarketAnalyticsFilters } from "@/types/analytics";
import { IndicatorCard } from "./IndicatorCard";
import { MarketFiltersPanel } from "./MarketFiltersPanel";
import { PricingPanels } from "./PricingPanels";
import { RankingPanels } from "./RankingPanels";
import { SupplyPanels } from "./SupplyPanels";
import {
  formatCount,
  formatCurrency,
  formatReferenceDate,
  formatSquareMetrePrice,
} from "./format";
import { useMarketAnalyticsFilters } from "./useMarketAnalyticsFilters";

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
    queryFn: () => getMarketRankings(filters),
  });

  const meta = overview.data?.meta ?? pricing.data?.meta ?? null;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análise de mercado</h1>
          <p className="text-muted-foreground mt-1">
            Estoque, preços e rankings da coleta publicada mais recente de cada imobiliária.
          </p>
        </div>
        {meta === null ? null : (
          <p className="text-sm text-muted-foreground">
            Coleta de referência: {formatReferenceDate(meta.data_reference_date)}
          </p>
        )}
      </div>

      <MarketFiltersPanel filters={filters} onChange={setFilters} />

      {meta?.notices.length ? (
        <ul className="mb-6 space-y-1 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          {meta.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {overview.isPending || pricing.isPending ? (
          <PanelSkeleton count={5} />
        ) : (
          <>
            <IndicatorCard
              indicator={overview.data?.data.total_supply.indicator ?? "A1.01"}
              title="Imóveis em oferta"
              value={formatCount(overview.data?.data.total_supply.value)}
            />
            <IndicatorCard
              indicator="A2.01"
              title="Preço mediano"
              value={formatCurrency(pricing.data?.data.median_price.value)}
              sampleSize={pricing.data?.data.median_price.sample_size}
              insufficientSample={pricing.data?.data.median_price.insufficient_sample}
            />
            <IndicatorCard
              indicator="A2.02"
              title="Preço médio"
              value={formatCurrency(pricing.data?.data.average_price.value)}
              sampleSize={pricing.data?.data.average_price.sample_size}
              insufficientSample={pricing.data?.data.average_price.insufficient_sample}
            />
            <IndicatorCard
              indicator="A2.03"
              title="Metade central do mercado"
              value={`${formatCurrency(pricing.data?.data.central_price_range.p25)} – ${formatCurrency(
                pricing.data?.data.central_price_range.p75,
              )}`}
              insufficientSample={pricing.data?.data.central_price_range.insufficient_sample}
              hint="Percentis 25 e 75"
            />
            <IndicatorCard
              indicator="A2.04"
              title="Preço mediano por m²"
              value={formatSquareMetrePrice(
                pricing.data?.data.median_price_per_square_metre.value,
              )}
              sampleSize={pricing.data?.data.median_price_per_square_metre.sample_size}
              insufficientSample={
                pricing.data?.data.median_price_per_square_metre.insufficient_sample
              }
              hint={`${formatCount(
                pricing.data?.data.median_price_per_square_metre.sample_size,
              )} imóveis com área informada`}
            />
          </>
        )}
      </section>

      <div className="space-y-6">
        {overview.isPending ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton count={4} />
          </div>
        ) : null}
        {overview.data ? <SupplyPanels overview={overview.data.data} /> : null}

        {pricing.isPending ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton count={2} />
          </div>
        ) : null}
        {pricing.data ? <PricingPanels pricing={pricing.data.data} /> : null}

        {rankings.isPending ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton count={2} />
          </div>
        ) : null}
        {rankings.data ? <RankingPanels rankings={rankings.data.data} /> : null}
      </div>
    </div>
  );
}

function PanelSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-40 w-full rounded-xl" />
      ))}
    </>
  );
}

function queryKeyFor(filters: MarketAnalyticsFilters): string {
  return JSON.stringify(filters);
}
