import { Suspense } from "react";
import { MarketDashboardClient } from "@/components/features/analytics/MarketDashboardClient";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Análise de mercado",
  description: "Estoque, preços e rankings do mercado imobiliário coletado.",
};

export default function MarketAnalyticsPage() {
  return (
    <Suspense fallback={<MarketAnalyticsSkeleton />}>
      <MarketDashboardClient />
    </Suspense>
  );
}

function MarketAnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando indicadores" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[7.5rem] w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
