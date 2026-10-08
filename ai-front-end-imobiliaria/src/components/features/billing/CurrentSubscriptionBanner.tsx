"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { STAT_TONES, type StatTone } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Clock,
  CreditCard,
  Loader2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cancelSubscription } from "@/services/billingService";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AgencySubscription, SubscriptionStatus } from "@/types/billing";

const BILLING_LABEL: Record<string, string> = {
  PIX: "Pix",
  BOLETO: "Boleto Bancário",
  CREDIT_CARD: "Cartão de Crédito",
};

type StatusBadgeVariant = "success" | "warning" | "destructive" | "muted";

const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; icon: LucideIcon; badge: StatusBadgeVariant; tone: StatTone }
> = {
  active: {
    label: "Ativo",
    icon: CheckCircle2,
    badge: "success",
    tone: "success",
  },
  pending: {
    label: "Aguardando pagamento",
    icon: Clock,
    badge: "warning",
    tone: "warning",
  },
  inactive: {
    label: "Pagamento atrasado",
    icon: CircleAlert,
    badge: "destructive",
    tone: "destructive",
  },
  expired: {
    label: "Expirado",
    icon: CircleAlert,
    badge: "destructive",
    tone: "destructive",
  },
  cancelled: {
    label: "Cancelado",
    icon: CircleX,
    badge: "muted",
    tone: "muted",
  },
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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

  const canCancel =
    canManage &&
    (subscription.status === "active" || subscription.status === "pending");

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <SectionHeader
        actions={
          canCancel ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isCancelling}>
                  {isCancelling && <Loader2 className="animate-spin" />}
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
                  <AlertDialogAction onClick={handleCancel} variant="destructive">
                    Sim, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null
        }
        description="Plano contratado pela sua imobiliária."
        icon={CreditCard}
        title="Assinatura atual"
      />

      <div className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              STAT_TONES[config.tone],
            )}
          >
            <StatusIcon className="size-5" />
          </span>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg text-foreground">{subscription.plan.name}</p>
              <Badge variant={config.badge}>{config.label}</Badge>
            </div>
            {STATUS_MESSAGE[subscription.status] && (
              <p className="text-sm text-muted-foreground">
                {STATUS_MESSAGE[subscription.status]}
              </p>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-2xl tracking-tight text-foreground tabular-nums">
              {currency.format(subscription.plan.pricePerMonth)}
            </span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Próxima cobrança
              </p>
              <p className="text-sm text-foreground tabular-nums">
                {nextDue ?? "—"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <Wallet className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Método
              </p>
              <p className="text-sm text-foreground">
                {BILLING_LABEL[subscription.billingType]}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
