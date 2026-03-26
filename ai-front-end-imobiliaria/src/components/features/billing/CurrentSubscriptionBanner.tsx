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
import type { TenantSubscription, SubscriptionStatus } from "@/types/billing";

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
  subscription: TenantSubscription;
  canManage?: boolean;
  onChangePlanClick?: () => void;
}

export function CurrentSubscriptionBanner({
  subscription,
  canManage = true,
  onChangePlanClick,
}: CurrentSubscriptionBannerProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const rawStatus = (subscription?.status || "pending").toString().toLowerCase();
  const config =
    STATUS_CONFIG[rawStatus as SubscriptionStatus] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;

  if (typeof window === "undefined") {
    // Log in next.js server console to see why it was faulty
    console.log("CurrentSubscriptionBanner received subscription:", subscription);
  }

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
    
  // Format billingType to ensure case-insensitive lookup, defaulting to "PIX" if undefined
  const rawBillingType = (subscription?.billingType || "PIX").toString().toUpperCase();

  return (
    <div className={cn("rounded-2xl border p-5", config.banner)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <StatusIcon className="mt-0.5 h-5 w-5 shrink-0 text-current" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground">
                {subscription.plan?.name ?? "Plano"}
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
                  {BILLING_LABEL[rawBillingType]}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {canManage &&
          (rawStatus === "active" ||
            rawStatus === "pending") && (
            <div className="flex items-center gap-2 shrink-0">
              {onChangePlanClick && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isCancelling}
                  onClick={onChangePlanClick}
                >
                  Alterar Plano
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isCancelling}
                  >
                    {isCancelling && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Cancelar
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
            </div>
          )}
      </div>
    </div>
  );
}
