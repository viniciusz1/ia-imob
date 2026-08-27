"use client";

import { Button } from "@/components/ui/button";

export default function NewPropertiesError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl rounded-lg border p-6 text-center">
      <h1 className="text-2xl font-semibold">Não foi possível abrir Novos imóveis</h1>
      <p className="mt-2 text-sm text-muted-foreground">Tente carregar a página novamente.</p>
      <Button type="button" className="mt-4" onClick={reset}>
        Tentar novamente
      </Button>
    </div>
  );
}
