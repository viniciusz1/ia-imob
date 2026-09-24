import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE } from "./format";

interface StatTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  insufficientSample?: boolean;
}

export function StatTile({
  label,
  value,
  icon: Icon,
  insufficientSample = false,
}: StatTileProps) {
  return (
    <Card className="gap-0 py-5">
      <CardContent className="space-y-1 px-5">
        {/* O ícone divide a linha com o rótulo, que pode encurtar. O valor fica
            sozinho na linha de baixo com a largura inteira do card, porque é
            ele que não pode perder caractere quando a coluna estreita. */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon aria-hidden className="size-4 shrink-0" />
          <p className="truncate text-sm font-medium" title={label}>
            {label}
          </p>
        </div>

        <p
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums 2xl:text-3xl",
            insufficientSample && "text-muted-foreground",
          )}
          title={insufficientSample ? "Amostra insuficiente" : undefined}
        >
          {insufficientSample ? EMPTY_VALUE : value}
        </p>
      </CardContent>
    </Card>
  );
}
