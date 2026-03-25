import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import type { SubscriptionPlan } from "@/types/billing";

interface PlanCardProps {
  plan: SubscriptionPlan;
  isSelected: boolean;
  onSelect: () => void;
  isMostPopular?: boolean;
}

const PLAN_FEATURES: Record<string, string[]> = {
  monthly: [
    "Acesso completo à plataforma",
    "Suporte por e-mail",
    "Atualização mensal",
  ],
  semiannual: [
    "Acesso completo à plataforma",
    "Suporte prioritário",
    "Economia de 15% vs mensal",
    "Relatórios avançados",
  ],
  annual: [
    "Acesso completo à plataforma",
    "Suporte 24/7",
    "Economia de 25% vs mensal",
    "Relatórios avançados",
    "Gerente de conta dedicado",
  ],
};

const CYCLE_LABEL: Record<string, string> = {
  MONTHLY: "mês",
  SEMIANNUALLY: "6 meses",
  YEARLY: "ano",
};

const CHARGE_LABEL: Record<string, string> = {
  monthly: "por mês",
  semiannual: "a cada 6 meses",
  annual: "por ano",
};

export function PlanCard({
  plan,
  isSelected,
  onSelect,
  isMostPopular,
}: PlanCardProps) {
  const features = PLAN_FEATURES[plan.slug] ?? [];

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary shadow-md"
          : "border-border hover:border-primary/50 hover:shadow-md",
        isMostPopular && "border-primary/60",
      )}
    >
      {/* Most popular badge */}
      {isMostPopular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <Badge className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold shadow">
            <Star className="h-3 w-3 fill-current" />
            Mais Popular
          </Badge>
        </div>
      )}

      <div className="flex-1 space-y-4">
        {/* Plan header */}
        <div>
          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-foreground">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(plan.pricePerMonth)}
            </span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Cobrado{" "}
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(plan.totalPrice)}{" "}
            {CHARGE_LABEL[plan.slug]}
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Button
        className="mt-6 w-full"
        variant={isSelected ? "default" : "outline"}
        onClick={onSelect}
      >
        {isSelected ? "Plano Selecionado" : "Selecionar Plano"}
      </Button>
    </div>
  );
}
