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
import { CreditCard } from "lucide-react";

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
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CreditCard className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Plano &amp; Assinatura
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie o plano de assinatura da sua imobiliária
          </p>
        </div>
      </div>

      {/* Current subscription banner */}
      {currentSubscription && (
        <CurrentSubscriptionBanner
          subscription={currentSubscription}
          canManage
        />
      )}

      {/* Plan selector — shown when no active subscription or when expired/cancelled */}
      {!hasActiveSubscription && (
        <div className="space-y-4">
          {currentSubscription === null && (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
              Você ainda não possui uma assinatura ativa. Escolha um plano
              abaixo para começar.
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
        </div>
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
