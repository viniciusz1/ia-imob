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
import { Info, Loader2 } from "lucide-react";
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
      <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
          <DialogTitle>Confirmar Assinatura</DialogTitle>
          <DialogDescription>
            Revise os detalhes antes de prosseguir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Cobrança
            </p>
            <p className="mt-1 text-2xl tracking-tight text-foreground tabular-nums">
              {formattedTotal}
            </p>
            <p className="text-xs text-muted-foreground">
              {CHARGE_LABEL[plan.slug]}
            </p>
          </div>

          <dl className="divide-y rounded-lg border text-sm">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Plano</dt>
              <dd className="text-foreground">{plan.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">Método</dt>
              <dd className="text-foreground">{BILLING_LABEL[billingType]}</dd>
            </div>
          </dl>

          <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-info" />
            <p className="text-foreground">
              Após confirmar, você receberá as instruções de pagamento. A
              assinatura só será ativada após a confirmação do pagamento.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Voltar
          </Button>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="animate-spin" />}
            Confirmar Assinatura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
