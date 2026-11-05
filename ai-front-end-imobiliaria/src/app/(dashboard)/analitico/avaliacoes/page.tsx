import { Suspense } from "react";
import { ValuationDashboardClient } from "@/components/features/analytics/ValuationDashboardClient";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Análise de avaliações",
  description: "Volume, resultado e valores das avaliações salvas pela imobiliária.",
};

export default function ValuationAnalyticsPage() {
  return (
    <Suspense fallback={<ValuationAnalyticsSkeleton />}>
      <ValuationDashboardClient />
    </Suspense>
  );
}

function ValuationAnalyticsSkeleton() {
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
    </div>
  );
}
