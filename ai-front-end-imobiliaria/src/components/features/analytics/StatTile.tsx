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
      <CardContent className="flex items-center gap-4 px-5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon aria-hidden className="size-5" />
        </span>

        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              "truncate text-2xl font-semibold tracking-tight sm:text-3xl",
              insufficientSample && "text-muted-foreground",
            )}
            // The figure can be long (R$ 1.234.567/m²) and truncates on narrow
            // screens, so keep the full text reachable on hover.
            title={insufficientSample ? "Amostra insuficiente" : value}
          >
            {insufficientSample ? EMPTY_VALUE : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
