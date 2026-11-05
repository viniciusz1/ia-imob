import { Skeleton } from '@/components/ui/skeleton';

export default function BillingLoading() {
  return (
    <section aria-busy="true" className="space-y-6" role="status">
      <span className="sr-only">Carregando planos…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Assinatura atual */}
      <Skeleton className="h-44 w-full rounded-xl" />

      {/* Planos */}
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-80 rounded-xl" />
        ))}
      </div>

      {/* Método de pagamento */}
      <Skeleton className="h-48 w-full rounded-xl" />
    </section>
  );
}
