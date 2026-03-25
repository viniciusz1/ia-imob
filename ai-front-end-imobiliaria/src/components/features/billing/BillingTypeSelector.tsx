import { cn } from "@/lib/utils";
import { QrCode, FileText, CreditCard } from "lucide-react";
import type { BillingType } from "@/types/billing";

const BILLING_OPTIONS: {
  value: BillingType;
  label: string;
  Icon: React.ElementType;
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
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Método de Pagamento</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BILLING_OPTIONS.map(
          ({ value: optValue, label, Icon, description }) => {
            const isSelected = value === optValue;
            return (
              <button
                key={optValue}
                type="button"
                onClick={() => onChange(optValue)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer",
                  isSelected
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted",
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      isSelected ? "text-primary" : "text-foreground",
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}
