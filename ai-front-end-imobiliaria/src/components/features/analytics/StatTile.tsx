import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE, formatCount } from "./format";

interface StatTileProps {
  indicator: string;
  label: string;
  value: string;
  context?: string;
  sampleSize?: number;
  insufficientSample?: boolean;
  hero?: boolean;
}

export function StatTile({
  indicator,
  label,
  value,
  context,
  sampleSize,
  insufficientSample = false,
  hero = false,
}: StatTileProps) {
  const footer = insufficientSample
    ? `Amostra insuficiente: ${formatCount(sampleSize)} imóveis`
    : context;

  return (
    <Card className={cn("gap-0 py-5", hero && "border-primary/30 bg-primary/5")}>
      <CardContent className="flex h-full flex-col justify-between gap-4 px-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>

        <div className="space-y-1">
          <p
            className={cn(
              "font-semibold tracking-tight",
              hero ? "text-4xl sm:text-5xl" : "text-3xl",
              insufficientSample && "text-muted-foreground",
            )}
          >
            {insufficientSample ? EMPTY_VALUE : value}
          </p>
          <p className="min-h-5 text-sm text-muted-foreground">{footer}</p>
        </div>

        <p className="text-xs text-muted-foreground/70">{indicator}</p>
      </CardContent>
    </Card>
  );
}
