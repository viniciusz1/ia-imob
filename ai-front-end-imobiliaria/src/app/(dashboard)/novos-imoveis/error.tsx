"use client";

import { Button } from "@/components/ui/button";

export default function NewPropertiesError({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <h1 className="text-xl font-semibold">Não foi possível abrir Novos imóveis</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tente carregar a página novamente.
      </p>
      <Button type="button" className="mt-4" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
