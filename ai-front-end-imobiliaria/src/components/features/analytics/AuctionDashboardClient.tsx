"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  Coins,
  Gavel,
  Percent,
  Ruler,
  Scale,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getAuctionAnalytics } from "@/services/marketAnalyticsService";
import type { MarketAnalyticsFilters } from "@/types/analytics";
import { AuctionBreakdownTable } from "./AuctionBreakdownTable";
import { AuctionOpportunitiesTable } from "./AuctionOpportunitiesTable";
import { MarketFiltersPanel } from "./MarketFiltersPanel";
import { StatTile } from "./StatTile";
import { formatCount, formatCurrency, formatReferenceDate, formatShare } from "./format";
import { useMarketAnalyticsFilters } from "./useMarketAnalyticsFilters";

/** Teto que a API aceita em `limite`, usado nos recortes e na lista de lotes. */
const LIMIT = 50;

export function AuctionDashboardClient() {
  const { filters, setFilters } = useMarketAnalyticsFilters();
  // Os campos digitados (valor, área) mudam a URL na hora; a requisição só sai
  // quando a digitação para.
  const key = useDebouncedValue(JSON.stringify(filters));
  const requested = useMemo(() => JSON.parse(key) as MarketAnalyticsFilters, [key]);

  const { data, isPending, isPlaceholderData, isFetching } = useQuery({
    queryKey: ["auction-analytics", key],
    queryFn: () => getAuctionAnalytics(requested, LIMIT),
    placeholderData: keepPreviousData,
  });

  const isRefreshing = isPlaceholderData && isFetching;
  const indicators = data?.data;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          data === undefined ? null : (
            <Badge variant="info">
              <CalendarClock aria-hidden />
              Inventário de referência: {formatReferenceDate(data.meta.data_reference_date)}
            </Badge>
          )
        }
        description="Lotes em leilão comparados com a avaliação judicial e com o preço que o mercado pede na mesma região."
        title="Análise de leilões e oportunidades"
      />

      <MarketFiltersPanel filters={filters} onChange={setFilters} />

      <section
        aria-busy={isRefreshing}
        className={cn(
          "grid gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3",
          isRefreshing && "opacity-60",
        )}
      >
        {isPending || indicators === undefined ? (
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-[7.5rem] w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatTile
              icon={Gavel}
              label="Lotes em leilão"
              value={formatCount(indicators.total_lots.value)}
            />
            <StatTile
              icon={Coins}
              label="Lance mínimo mediano"
              tone="info"
              value={formatCurrency(indicators.median_minimum_bid.value)}
            />
            <StatTile
              icon={Scale}
              label="Avaliação mediana"
              tone="info"
              value={formatCurrency(indicators.median_appraisal.value)}
            />
            <StatTile
              icon={Percent}
              label="Desconto mediano sobre a avaliação"
              tone="warning"
              value={formatShare(indicators.median_discount.value)}
            />
            <StatTile
              icon={TrendingDown}
              label="Lotes abaixo do valor de mercado"
              tone="success"
              value={`${formatCount(indicators.below_market.value)} (${formatShare(indicators.below_market_share.value)})`}
            />
            <StatTile
              icon={Ruler}
              label="Lance mínimo mediano por m²"
              value={formatCurrency(indicators.median_minimum_bid_per_square_metre.value)}
            />
          </>
        )}
      </section>

      {indicators === undefined ? (
        <>
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-72 w-full rounded-xl" />
        </>
      ) : (
        <div
          aria-busy={isRefreshing}
          className={cn("space-y-6 transition-opacity duration-200", isRefreshing && "opacity-60")}
        >
          <AuctionOpportunitiesTable items={indicators.opportunities.items} />
          <AuctionBreakdownTable analytics={indicators} />
        </div>
      )}
    </div>
  );
}
