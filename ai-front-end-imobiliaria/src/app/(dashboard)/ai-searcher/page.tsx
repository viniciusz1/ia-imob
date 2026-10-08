import { Suspense } from "react";
import { AiSearcherClient } from "@/components/features/ai-searcher/AiSearcherClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Buscador com IA — Busca de Imóveis",
  description: "Busque e filtre imóveis disponíveis com filtros avançados.",
};

export default function AiSearcherPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeader
            title="Buscador com IA"
            description="Carregando o buscador..."
          />
          <Skeleton className="mx-auto h-80 w-full max-w-3xl rounded-xl" />
        </div>
      }
    >
      <AiSearcherClient />
    </Suspense>
  );
}
