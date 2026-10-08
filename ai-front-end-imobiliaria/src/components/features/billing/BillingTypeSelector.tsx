import { cn } from "@/lib/utils";
import { QrCode, FileText, CreditCard, type LucideIcon } from "lucide-react";
import type { BillingType } from "@/types/billing";

const BILLING_OPTIONS: {
  value: BillingType;
  label: string;
  Icon: LucideIcon;
  description: string;
}[] = [
  {
    value: "PIX",
    label: "Pix",
    Icon: QrCode,
    description: "Aprovação instantânea",
  },
  {
    value: "BOLETO",
    label: "Boleto Bancário",
    Icon: FileText,
    description: "Vencimento em 3 dias úteis",
  },
  {
    value: "CREDIT_CARD",
    label: "Cartão de Crédito",
    Icon: CreditCard,
    description: "Redirecionado ao checkout Asaas",
  },
];

interface BillingTypeSelectorProps {
  value: BillingType;
  onChange: (value: BillingType) => void;
}

export function BillingTypeSelector({
  value,
  onChange,
}: BillingTypeSelectorProps) {
  return (
    <div
      aria-label="Método de Pagamento"
      className="grid gap-4 sm:grid-cols-3"
      role="group"
    >
      {BILLING_OPTIONS.map(({ value: optValue, label, Icon, description }) => {
        const isSelected = value === optValue;

        return (
          <button
            key={optValue}
            aria-pressed={isSelected}
            type="button"
            onClick={() => onChange(optValue)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "bg-card hover:border-primary/30 hover:bg-muted/50",
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-sm",
                  isSelected ? "text-primary" : "text-foreground",
                )}
              >
                {label}
              </span>
              <span className="block text-xs text-muted-foreground">
                {description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
