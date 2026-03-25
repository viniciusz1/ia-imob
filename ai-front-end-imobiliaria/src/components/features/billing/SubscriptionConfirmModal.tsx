"use client";

import { useTransition } from "react";
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

const BILLING_LABEL: Record<BillingType, string> = {
  PIX: "Pix",
  BOLETO: "Boleto Bancário",
  CREDIT_CARD: "Cartão de Crédito",
};

const CHARGE_LABEL: Record<string, string> = {
  monthly: "por mês",
  semiannual: "a cada 6 meses",
  annual: "por ano",
};

interface SubscriptionConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  plan: SubscriptionPlan | null;
  billingType: BillingType;
}

export function SubscriptionConfirmModal({
  open,
  onClose,
  onConfirm,
  plan,
  billingType,
}: SubscriptionConfirmModalProps) {
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      await onConfirm();
    });
  }

  if (!plan) return null;

  const formattedTotal = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(plan.totalPrice);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => !isOpen && !isPending && onClose()}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirmar Assinatura</DialogTitle>
          <DialogDescription>
            Revise os detalhes antes de prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plano</span>
              <span className="font-semibold text-foreground">{plan.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cobrança</span>
              <span className="font-semibold text-foreground">
                {formattedTotal} {CHARGE_LABEL[plan.slug]}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Método</span>
              <span className="font-semibold text-foreground">
                {BILLING_LABEL[billingType]}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Após confirmar, você receberá as instruções de pagamento. A
            assinatura só será ativada após a confirmação do pagamento.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Voltar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isPending}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
