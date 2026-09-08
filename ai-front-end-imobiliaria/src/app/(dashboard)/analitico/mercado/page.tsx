import { Suspense } from "react";
import { MarketDashboardClient } from "@/components/features/analytics/MarketDashboardClient";

export const metadata = {
  title: "Análise de mercado",
  description: "Estoque, preços e rankings do mercado imobiliário coletado.",
};

export default function MarketAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Carregando indicadores...</p>
        </div>
      }
    >
      <MarketDashboardClient />
    </Suspense>
  );
}
