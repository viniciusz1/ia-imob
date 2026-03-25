import { BillingPage } from '@/components/features/billing/BillingPage';
import { fetchPlans, fetchCurrentSubscription } from '@/services/billingService';

export const metadata = {
  title: 'Planos e Assinatura — ia-imob',
  description: 'Gerencie o plano de assinatura da sua imobiliária.',
};

export default async function BillingRoute() {
  const [plans, currentSubscription] = await Promise.all([
    fetchPlans(),
    fetchCurrentSubscription(),
  ]);

  return (
    <BillingPage
      plans={plans}
      currentSubscription={currentSubscription}
    />
  );
}
