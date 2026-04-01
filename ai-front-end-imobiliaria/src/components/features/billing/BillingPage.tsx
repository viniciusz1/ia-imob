"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type {
  SubscriptionPlan,
  TenantSubscription,
  BillingType,
} from "@/types/billing";
import { createSubscription, changePlan } from "@/services/billingService";
import { PlanSelector } from "./PlanSelector";
import { CurrentSubscriptionBanner } from "./CurrentSubscriptionBanner";
import { SubscriptionConfirmModal } from "./SubscriptionConfirmModal";
import { ChangePlanModal } from "./ChangePlanModal";
import { CreditCard } from "lucide-react";

interface BillingPageProps {
  plans: SubscriptionPlan[];
  currentSubscription: TenantSubscription | null;
}

const SHOW_PLAN_SELECTOR_STATUSES = new Set(["expired", "cancelled"]);

export function BillingPage({ plans, currentSubscription }: BillingPageProps) {
  const router = useRouter();

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null,
  );
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [changePlanModalOpen, setChangePlanModalOpen] = useState(false);

  // Show the banner for active/pending/inactive; show plan selector for expired/cancelled/null
  const currentStatus = currentSubscription?.status?.toString().toLowerCase() || "";
  const hasActiveSubscription =
    currentSubscription !== null &&
    !SHOW_PLAN_SELECTOR_STATUSES.has(currentStatus);

  async function handleConfirm() {
    if (!selectedPlan) return;
    try {
      const sub = await createSubscription({
        plan_slug: selectedPlan.slug,
        billing_type: billingType,
      });
      toast.success("Assinatura criada! Acesse o link de pagamento para ativar.");
      router.refresh();
    } catch {
      toast.error("Erro ao criar assinatura. Tente novamente.");
    } finally {
      setConfirmOpen(false);
    }
  }

  async function handleChangePlan(planSlug: string, billingType: BillingType) {
    try {
      await changePlan({ plan_slug: planSlug, billing_type: billingType });
      toast.success("Plano alterado com sucesso! O próximo ciclo será ajustado.");
      setChangePlanModalOpen(false);
      router.refresh();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        "Erro ao alterar o plano. Tente novamente mais tarde.";
      toast.error(msg);
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
          onChangePlanClick={() => setChangePlanModalOpen(true)}
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

      {/* Change Plan Modal */}
      <ChangePlanModal
        open={changePlanModalOpen}
        onClose={() => setChangePlanModalOpen(false)}
        onConfirm={handleChangePlan}
        plans={plans}
        currentPlanSlug={currentSubscription?.plan?.slug}
      />
    </div>
  );
}
