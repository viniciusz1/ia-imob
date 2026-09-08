"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getMarketOverview,
  getMarketPricing,
  getMarketRankings,
} from "@/services/marketAnalyticsService";
import type {
  CentralRangeIndicator,
  MarketAnalyticsFilters,
  MarketOverview,
} from "@/types/analytics";
import { StatTile } from "./StatTile";
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

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overview.isPending || pricing.isPending ? (
          <PanelSkeleton count={4} className="h-44" />
        ) : (
          <>
            <StatTile
              hero
              label="Imóveis em oferta"
              value={formatCount(overview.data?.data.total_supply.value)}
              context={agencyContext(overview.data?.data)}
            />
            <StatTile
              label="Preço mediano"
              value={formatCurrency(pricing.data?.data.median_price.value)}
              context={centralRangeContext(pricing.data?.data.central_price_range)}
              sampleSize={pricing.data?.data.median_price.sample_size}
              insufficientSample={pricing.data?.data.median_price.insufficient_sample}
            />
            <StatTile
              label="Preço médio"
              value={formatCurrency(pricing.data?.data.average_price.value)}
              context={outlierContext(pricing.data?.data.average_price.outliers_discarded)}
              sampleSize={pricing.data?.data.average_price.sample_size}
              insufficientSample={pricing.data?.data.average_price.insufficient_sample}
            />
            <StatTile
              label="Preço mediano por m²"
              value={formatSquareMetrePrice(
                pricing.data?.data.median_price_per_square_metre.value,
              )}
              context={areaCoverageContext(
                pricing.data?.data.median_price_per_square_metre.sample_size,
                overview.data?.data.total_supply.value,
              )}
              sampleSize={pricing.data?.data.median_price_per_square_metre.sample_size}
              insufficientSample={
                pricing.data?.data.median_price_per_square_metre.insufficient_sample
              }
            />
          </>
        )}
      </section>

      <div className="space-y-6">
        {overview.isPending ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <PanelSkeleton count={2} />
          </div>
        ) : null}
        {overview.data ? <SupplyPanels overview={overview.data.data} /> : null}

        {pricing.isPending ? <PanelSkeleton count={1} /> : null}
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

function agencyContext(overview: MarketOverview | undefined): string | undefined {
  const agencies = overview?.by_agency.items.length;

  return agencies === undefined
    ? undefined
    : `${formatCount(agencies)} ${agencies === 1 ? "imobiliária" : "imobiliárias"} no recorte`;
}

function centralRangeContext(range: CentralRangeIndicator | undefined): string | undefined {
  if (range === undefined || range.insufficient_sample) return undefined;

  return `Metade central entre ${formatCurrency(range.p25)} e ${formatCurrency(range.p75)}`;
}

function outlierContext(discarded: number | undefined): string | undefined {
  if (discarded === undefined) return undefined;
  if (discarded === 0) return "Nenhum valor fora do padrão";

  return `${formatCount(discarded)} valores fora do padrão descartados`;
}

function areaCoverageContext(sample: number | undefined, total: number | undefined): string | undefined {
  if (sample === undefined || total === undefined || total === 0) return undefined;

  return `${formatCount(sample)} de ${formatCount(total)} imóveis têm área informada`;
}
