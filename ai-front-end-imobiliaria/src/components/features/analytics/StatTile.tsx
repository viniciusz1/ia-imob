import type { LucideIcon } from "lucide-react";
import { STAT_TONES, type StatTone } from "@/components/layout/StatCard";
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
    <Card className="h-full gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-muted-foreground" title={label}>
          {label}
        </p>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            STAT_TONES[insufficientSample ? "muted" : tone],
          )}
        >
          <Icon aria-hidden className="size-5" />
        </span>
      </div>

      {/* O valor fica sozinho na linha com a largura inteira do card, porque é
          ele que não pode perder caractere quando a coluna estreita. */}
      <p
        className={cn(
          "mt-2 text-3xl leading-none tracking-tight tabular-nums",
          insufficientSample ? "text-muted-foreground" : "text-foreground",
        )}
        title={insufficientSample ? "Amostra insuficiente" : undefined}
      >
        {insufficientSample ? EMPTY_VALUE : value}
      </p>
    </Card>
  );
}
