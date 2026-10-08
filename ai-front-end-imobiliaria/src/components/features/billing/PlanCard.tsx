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

const CHARGE_LABEL: Record<string, string> = {
  monthly: "por mês",
  semiannual: "a cada 6 meses",
  annual: "por ano",
};

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

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
        "flex flex-col rounded-xl border bg-card p-6 shadow-xs shadow-black/[0.03] transition-colors",
        isSelected
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : isMostPopular
            ? "border-primary ring-1 ring-primary/20"
            : "hover:border-primary/30",
      )}
    >
      <div className="flex-1 space-y-5">
        {/* Plan header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base text-foreground">{plan.name}</h3>
            {isMostPopular && (
              <Badge>
                <Star className="fill-current" />
                Mais Popular
              </Badge>
            )}
          </div>

          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl leading-none tracking-tight text-foreground tabular-nums">
                {currency.format(plan.pricePerMonth)}
              </span>
              <span className="text-sm text-muted-foreground">/mês</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              Cobrado {currency.format(plan.totalPrice)} {CHARGE_LABEL[plan.slug]}
            </p>
          </div>
        </div>

        {/* Features */}
        <ul className="space-y-2.5 border-t pt-5">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
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
        {isSelected && <Check />}
        {isSelected ? "Plano Selecionado" : "Selecionar Plano"}
      </Button>
    </div>
  );
}
