import { ValuationDashboardClient } from "@/components/features/analytics/ValuationDashboardClient";

export const metadata = {
  title: "Análise de avaliações",
  description: "Volume, resultado e valores das avaliações salvas pela imobiliária.",
};

export default function ValuationAnalyticsPage() {
  return <ValuationDashboardClient />;
}
