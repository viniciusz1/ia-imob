"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  SubscriptionPlan,
  AgencySubscription,
  BillingType,
} from "@/types/billing";
import { createSubscription } from "@/services/billingService";
import { PlanSelector } from "./PlanSelector";
import { CurrentSubscriptionBanner } from "./CurrentSubscriptionBanner";
import { SubscriptionConfirmModal } from "./SubscriptionConfirmModal";
import { Info } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface BillingPageProps {
  plans: SubscriptionPlan[];
  currentSubscription: AgencySubscription | null;
}

const SHOW_PLAN_SELECTOR_STATUSES = new Set(["expired", "cancelled"]);

export function BillingPage({ plans, currentSubscription }: BillingPageProps) {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Show the banner for active/pending/inactive; show plan selector for expired/cancelled/null
  const hasActiveSubscription =
    currentSubscription !== null &&
    !SHOW_PLAN_SELECTOR_STATUSES.has(currentSubscription.status);

  async function handleConfirm() {
    if (!selectedPlan) return;
    try {
      await createSubscription({
        plan_slug: selectedPlan.slug,
        billing_type: billingType,
      });
      toast.success("Assinatura criada! Realize o pagamento para ativar.");
      router.refresh();
    } catch {
      toast.error("Erro ao criar assinatura. Tente novamente.");
    } finally {
      setConfirmOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description="Gerencie o plano de assinatura da sua imobiliária"
        title="Plano & Assinatura"
      />

      {/* Current subscription banner */}
      {currentSubscription && (
        <CurrentSubscriptionBanner
          subscription={currentSubscription}
          canManage
        />
      )}

      {/* Plan selector — shown when no active subscription or when expired/cancelled */}
      {!hasActiveSubscription && (
        <>
          {currentSubscription === null && (
            <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-info" />
              <p className="text-foreground">
                Você ainda não possui uma assinatura ativa. Escolha um plano
                abaixo para começar.
              </p>
            </div>
          )}

          <PlanSelector
            plans={plans}
            selectedPlan={selectedPlan}
            billingType={billingType}
            onSelectPlan={setSelectedPlan}
            onChangeBillingType={setBillingType}
            onContinue={() => setConfirmOpen(true)}
          />
        </>
      )}

      {/* Confirm modal */}
      <SubscriptionConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        plan={selectedPlan}
        billingType={billingType}
      />
    </div>
  );
}
