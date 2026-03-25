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
    <div className="space-y-8">
      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
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

      {/* Billing type + CTA */}
      <div className="rounded-2xl border bg-card p-6 space-y-6">
        <BillingTypeSelector
          value={billingType}
          onChange={onChangeBillingType}
        />

        <div className="flex justify-end">
          <Button
            disabled={!selectedPlan}
            onClick={onContinue}
            className="gap-2"
            size="lg"
          >
            Continuar
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
