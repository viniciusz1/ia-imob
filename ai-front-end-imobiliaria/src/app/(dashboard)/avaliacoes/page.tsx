import { ValuationsClient } from "@/components/features/valuations/ValuationsClient";

export const metadata = {
  title: "Avaliar imóvel",
  description: "Calcule e consulte avaliações de mercado.",
};

export default function ValuationsPage() {
  return <ValuationsClient />;
}
