"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { cancelSubscription } from "@/services/billingService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AgencySubscription, SubscriptionStatus } from "@/types/billing";

const BILLING_LABEL: Record<string, string> = {
  PIX: "Pix",
  BOLETO: "Boleto Bancário",
  CREDIT_CARD: "Cartão de Crédito",
};

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; icon: React.ElementType; variant: string; banner: string }
> = {
  active: {
    label: "Ativo",
    icon: CheckCircle,
    variant: "bg-emerald-500",
    banner:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
  },
  pending: {
    label: "Aguardando pagamento",
    icon: Clock,
    variant: "bg-yellow-500",
    banner:
      "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30",
  },
  inactive: {
    label: "Pagamento atrasado",
    icon: AlertTriangle,
    variant: "bg-orange-500",
    banner:
      "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
  },
  expired: {
    label: "Expirado",
    icon: AlertTriangle,
    variant: "bg-destructive",
    banner: "border-destructive/20 bg-destructive/5",
  },
  cancelled: {
    label: "Cancelado",
    icon: AlertTriangle,
    variant: "bg-destructive",
    banner: "border-destructive/20 bg-destructive/5",
  },
};

const STATUS_MESSAGE: Partial<Record<SubscriptionStatus, string>> = {
  pending: "Aguardando confirmação do pagamento",
  inactive: "Pagamento atrasado — regularize para manter o acesso",
};

interface CurrentSubscriptionBannerProps {
  subscription: AgencySubscription;
  canManage?: boolean;
}

export function CurrentSubscriptionBanner({
  subscription,
  canManage = true,
}: CurrentSubscriptionBannerProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const config = STATUS_CONFIG[subscription.status];
  const StatusIcon = config.icon;

  async function handleCancel() {
    setIsCancelling(true);
    try {
      await cancelSubscription(subscription.id);
      toast.success("Assinatura cancelada com sucesso.");
      router.refresh();
    } catch {
      toast.error("Erro ao cancelar assinatura. Tente novamente.");
    } finally {
      setIsCancelling(false);
    }
  }

  const nextDue = subscription.nextDueDate
    ? new Intl.DateTimeFormat("pt-BR").format(
        new Date(subscription.nextDueDate),
      )
    : null;

  return (
    <div className={cn("rounded-2xl border p-5", config.banner)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <StatusIcon className="mt-0.5 h-5 w-5 shrink-0 text-current" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {subscription.plan.name}
              </span>
              <Badge className={cn("text-white text-xs", config.variant)}>
                {config.label}
              </Badge>
            </div>

            {STATUS_MESSAGE[subscription.status] && (
              <p className="text-sm text-muted-foreground">
                {STATUS_MESSAGE[subscription.status]}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {nextDue && (
                <span>
                  Próxima cobrança:{" "}
                  <strong className="text-foreground">{nextDue}</strong>
                </span>
              )}
              <span>
                Método:{" "}
                <strong className="text-foreground">
                  {BILLING_LABEL[subscription.billingType]}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {canManage &&
          (subscription.status === "active" ||
            subscription.status === "pending") && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isCancelling}
                  className="shrink-0"
                >
                  {isCancelling && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Cancelar Assinatura
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Ao cancelar, você perderá o acesso ao plano ao final do
                    período atual. Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Manter assinatura</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sim, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
      </div>
    </div>
  );
}
