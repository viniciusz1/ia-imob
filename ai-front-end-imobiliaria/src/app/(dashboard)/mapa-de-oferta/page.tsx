import { Suspense } from "react";

import { OfferMapClient } from "@/components/features/offer-map/OfferMapClient";

export default function OfferMapPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
          Carregando mapa de oferta...
        </div>
      }
    >
      <OfferMapClient />
    </Suspense>
  );
}
