import { Suspense } from "react";
import { AuctionDashboardClient } from "@/components/features/analytics/AuctionDashboardClient";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Análise de leilões",
  description: "Lotes em leilão, descontos e oportunidades abaixo do valor de mercado.",
};

export default function AuctionAnalyticsPage() {
  return (
    <Suspense fallback={<AuctionAnalyticsSkeleton />}>
      <AuctionDashboardClient />
    </Suspense>
  );
}

function AuctionAnalyticsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando indicadores" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[7.5rem] w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}
