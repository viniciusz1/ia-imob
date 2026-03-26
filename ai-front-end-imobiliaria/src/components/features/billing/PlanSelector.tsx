import type { SubscriptionPlan, BillingType } from "@/types/billing";
import { PlanCard } from "./PlanCard";
import { BillingTypeSelector } from "./BillingTypeSelector";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface PlanSelectorProps {
  plans: SubscriptionPlan[];
  selectedPlan: SubscriptionPlan | null;
  billingType: BillingType;
  onSelectPlan: (plan: SubscriptionPlan) => void;
  onChangeBillingType: (type: BillingType) => void;
  onContinue?: () => void;
  hideSubmitButton?: boolean;
}

export function PlanSelector({
  plans,
  selectedPlan,
  billingType,
  onSelectPlan,
  onChangeBillingType,
  onContinue,
  hideSubmitButton,
}: PlanSelectorProps) {
  // We sort plans by price so they display logically
  const sortedPlans = [...plans].sort(
    (a, b) => a.pricePerMonth - b.pricePerMonth,
  );

  return (
    <div className="space-y-8">
      {/* 1. Seleção de Plano */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">1. Escolha um plano</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isSelected={selectedPlan?.id === plan.id}
              onSelect={() => onSelectPlan(plan)}
              isMostPopular={plan.slug === "semiannual"}
            />
          ))}
        </div>
      </div>

      {selectedPlan && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h2 className="text-xl font-bold text-foreground">
            2. Selecione o Pagamento
          </h2>
          <BillingTypeSelector
            value={billingType}
            onChange={onChangeBillingType}
          />

          {!hideSubmitButton && (
            <div className="flex justify-end pt-4">
              <Button size="lg" onClick={onContinue}>
                Continuar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
