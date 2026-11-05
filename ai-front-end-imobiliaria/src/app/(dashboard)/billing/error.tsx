'use client';

import { useEffect } from 'react';
import { CircleAlert, RotateCcw } from 'lucide-react';

import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';

export default function BillingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-6">
      <PageHeader
        description="Gerencie o plano de assinatura da sua imobiliária"
        title="Plano & Assinatura"
      />

      <EmptyState
        action={
          <Button onClick={reset} variant="outline">
            <RotateCcw />
            Tentar novamente
          </Button>
        }
        description="Não foi possível buscar os dados de assinatura. Verifique sua conexão e tente novamente."
        icon={CircleAlert}
        title="Erro ao carregar os planos"
      />
    </div>
  );
}
