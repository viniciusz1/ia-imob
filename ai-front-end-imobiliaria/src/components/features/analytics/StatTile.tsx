import type { LucideIcon } from "lucide-react";
import { STAT_TONES, STAT_VALUE_TONES, type StatTone } from "@/components/layout/StatCard";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE } from "./format";

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: StatTone;
  insufficientSample?: boolean;
}

/**
 * Mesmo visual do `StatCard`, com o caso da amostra insuficiente: o valor dá
 * lugar ao traço e o card explica o motivo no `title`.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  tone = "primary",
  insufficientSample = false,
}: StatTileProps) {
  return (
    <Card className="h-full gap-4 p-6">
      <p className="min-w-0 truncate text-sm leading-4 font-semibold text-subtle" title={label}>
        {label}
      </p>

      {/* O valor nunca é cortado: em coluna estreita ele desce para baixo do
          ícone em vez de perder caractere. */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-xl p-[9px]",
            STAT_TONES[insufficientSample ? "muted" : tone],
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <p
          className={cn(
            "text-2xl leading-8 font-semibold tracking-[-0.01em] tabular-nums",
            insufficientSample ? "text-muted-foreground" : STAT_VALUE_TONES[tone],
          )}
          title={insufficientSample ? "Amostra insuficiente" : undefined}
        >
          {insufficientSample ? EMPTY_VALUE : value}
        </p>
      </div>
    </Card>
  );
}
