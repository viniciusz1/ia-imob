"use client";

import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  Coins,
  Gavel,
  Percent,
  Ruler,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  getAuctionAnalytics,
  getMarketOverview,
  getMarketPricing,
  getValuationAnalytics,
} from "@/services/marketAnalyticsService";
import type { MarketAnalyticsFilters } from "@/types/analytics";
import { MarketFiltersPanel } from "./MarketFiltersPanel";
import { StatTile } from "./StatTile";
import { formatCount, formatCurrency, formatReferenceDate, formatShare } from "./format";
import { useMarketAnalyticsFilters, writeFilters } from "./useMarketAnalyticsFilters";

/**
 * Entrada do módulo analítico: os mesmos filtros gerais das telas de detalhe,
 * com um resumo de cada análise e o link que leva para ela com o filtro junto.
 */
export function AnalyticsOverviewClient() {
  const { filters, setFilters } = useMarketAnalyticsFilters();
  const key = useDebouncedValue(JSON.stringify(filters));
  const requested = useMemo(() => JSON.parse(key) as MarketAnalyticsFilters, [key]);
  const query = useMemo(() => writeFilters(requested).toString(), [requested]);

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
  const auctions = useQuery({
    queryKey: ["auction-analytics", key],
    queryFn: () => getAuctionAnalytics(requested),
    placeholderData: keepPreviousData,
  });
  const valuations = useQuery({
    queryKey: ["valuation-analytics", key],
    queryFn: () => getValuationAnalytics(requested),
    placeholderData: keepPreviousData,
  });

  const reference = overview.data?.meta.data_reference_date ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        actions={
          overview.data === undefined ? null : (
            <Badge variant="info">
              <CalendarClock aria-hidden />
              Coleta de referência: {formatReferenceDate(reference)}
            </Badge>
          )
        }
        description="Mercado, leilões e avaliações sob o mesmo filtro, com o detalhe de cada análise a um clique."
        title="Módulo analítico"
      />

      <MarketFiltersPanel filters={filters} onChange={setFilters} />

      <ModuleSummary
        href={`/analitico/mercado${query ? `?${query}` : ""}`}
        icon={BarChart3}
        description="Estoque e preços da coleta publicada mais recente de cada imobiliária."
        linkLabel="Ver análise de mercado"
        loading={overview.isPending || pricing.isPending}
        title="Mercado"
      >
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
          icon={Ruler}
          label="Preço mediano por m²"
          value={formatCurrency(pricing.data?.data.median_price_per_square_metre.value)}
          insufficientSample={pricing.data?.data.median_price_per_square_metre.insufficient_sample}
        />
      </ModuleSummary>

      <ModuleSummary
        href={`/analitico/leiloes${query ? `?${query}` : ""}`}
        icon={Gavel}
        description="Lotes com lance mínimo abaixo da avaliação judicial ou do valor de mercado estimado."
        linkLabel="Ver análise de leilões"
        loading={auctions.isPending}
        title="Leilões e oportunidades"
      >
        <StatTile
          icon={Gavel}
          label="Lotes em leilão"
          value={formatCount(auctions.data?.data.total_lots.value)}
        />
        <StatTile
          icon={TrendingDown}
          label="Abaixo do valor de mercado"
          tone="success"
          value={`${formatCount(auctions.data?.data.below_market.value)} (${formatShare(auctions.data?.data.below_market_share.value)})`}
        />
        <StatTile
          icon={Percent}
          label="Desconto mediano sobre a avaliação"
          tone="warning"
          value={formatShare(auctions.data?.data.median_discount.value)}
        />
      </ModuleSummary>

      <ModuleSummary
        href={`/analitico/avaliacoes${query ? `?${query}` : ""}`}
        icon={ClipboardList}
        description="Volume e resultado das avaliações salvas pela sua imobiliária no período."
        linkLabel="Ver análise de avaliações"
        loading={valuations.isPending}
        title="Avaliações"
      >
        <StatTile
          icon={ClipboardList}
          label="Avaliações realizadas"
          value={formatCount(valuations.data?.data.total.value)}
        />
        <StatTile
          icon={Percent}
          label="Calculadas"
          tone="success"
          value={formatShare(valuations.data?.data.calculated_share.value)}
        />
        <StatTile
          icon={Coins}
          label="Valor central mediano"
          tone="info"
          value={formatCurrency(valuations.data?.data.median_value.value)}
        />
      </ModuleSummary>
    </div>
  );
}

interface ModuleSummaryProps {
  title: string;
  description: string;
  icon: typeof BarChart3;
  href: string;
  linkLabel: string;
  loading: boolean;
  children: React.ReactNode;
}

function ModuleSummary({
  title,
  description,
  icon,
  href,
  linkLabel,
  loading,
  children,
}: ModuleSummaryProps) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <SectionHeader
        description={description}
        href={href}
        icon={icon}
        linkLabel={linkLabel}
        title={title}
      />
      <div className={cn("grid gap-4 p-4 sm:p-5 lg:grid-cols-3")}>
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-[7.5rem] w-full rounded-xl" />
            ))
          : children}
      </div>
    </Card>
  );
}
