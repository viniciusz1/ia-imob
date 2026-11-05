import { Suspense } from "react";
import { AnalyticsOverviewClient } from "@/components/features/analytics/AnalyticsOverviewClient";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Módulo analítico",
  description: "Mercado, leilões e avaliações sob o mesmo filtro.",
};

export default function AnalyticsOverviewPage() {
  return (
    <Suspense fallback={<AnalyticsOverviewSkeleton />}>
      <AnalyticsOverviewClient />
    </Suspense>
  );
}

function AnalyticsOverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando indicadores" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-44 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-56 w-full rounded-xl" />
      ))}
    </div>
  );
}
