import type { SubscriptionPlan, BillingType } from "@/types/billing";
import { PlanCard } from "./PlanCard";
import { BillingTypeSelector } from "./BillingTypeSelector";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Wallet } from "lucide-react";

interface PlanSelectorProps {
  plans: SubscriptionPlan[];
  selectedPlan: SubscriptionPlan | null;
  billingType: BillingType;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  onChangeBillingType: (type: BillingType) => void;
  onContinue: () => void;
}

export function PlanSelector({
  plans,
  selectedPlan,
  billingType,
  onSelectPlan,
  onChangeBillingType,
  onContinue,
}: PlanSelectorProps) {
  return (
    <div className="space-y-6">
      {/* Plan cards */}
      <section aria-labelledby="plan-selector-title" className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base text-foreground" id="plan-selector-title">
            Escolha um plano
          </h2>
          <p className="text-xs text-muted-foreground">
            Compare os ciclos de cobrança e selecione o plano da sua imobiliária.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={() => onSelectPlan(plan)}
              isMostPopular={plan.slug === "semiannual"}
            />
          ))}
        </div>
      </section>

      {/* Billing type + CTA */}
      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader
          description="Escolha como prefere pagar a assinatura."
          icon={Wallet}
          title="Método de pagamento"
        />

        <div className="p-4 sm:p-5">
          <BillingTypeSelector
            value={billingType}
            onChange={onChangeBillingType}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-5">
          <p className="text-sm text-muted-foreground">
            {selectedPlan ? (
              <>
                Plano selecionado:{" "}
                <span className="text-foreground">{selectedPlan.name}</span>
              </>
            ) : (
              "Selecione um plano para continuar."
            )}
          </p>
          <Button disabled={!selectedPlan} onClick={onContinue}>
            Continuar
            <ArrowRight />
          </Button>
        </div>
      </Card>
    </div>
  );
}
