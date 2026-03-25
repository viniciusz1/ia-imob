import { Suspense } from "react";
import { AiSearcherClient } from "@/components/features/ai-searcher/AiSearcherClient";

export const metadata = {
  title: "AI Searcher — Busca de Imóveis",
  description: "Busque e filtre imóveis disponíveis com filtros avançados.",
};

export default function AiSearcherPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      }
    >
      <AiSearcherClient />
    </Suspense>
  );
}
