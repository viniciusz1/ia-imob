"use client";

import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { SubscriptionPlan, BillingType } from "@/types/billing";
import { PlanSelector } from "./PlanSelector";

interface ChangePlanModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (planSlug: string, billingType: BillingType) => Promise<void>;
  plans: SubscriptionPlan[];
  currentPlanSlug?: string;
}

export function ChangePlanModal({
  open,
  onClose,
  onConfirm,
  plans,
  currentPlanSlug,
}: ChangePlanModalProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingType, setBillingType] = useState<BillingType>("PIX");

  // Keep all plans except the one currently active
  const availablePlans = plans.filter((p) => p.slug !== currentPlanSlug);

  function handleConfirm() {
    if (!selectedPlan) return;
    startTransition(async () => {
      await onConfirm(selectedPlan.slug, billingType);
    });
  }

  // Handle cleanup when modal closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isPending) {
      setSelectedPlan(null);
      setBillingType("PIX");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar Plano de Assinatura</DialogTitle>
          <DialogDescription>
            Escolha um novo plano abaixo. O valor do seu próximo ciclo será
            ajustado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <PlanSelector
            plans={availablePlans}
            selectedPlan={selectedPlan}
            billingType={billingType}
            onSelectPlan={setSelectedPlan}
            onChangeBillingType={setBillingType}
            hideSubmitButton
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4 border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Sair
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlan || isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar Alteração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
