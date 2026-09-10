import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE, formatCount } from "./format";

interface StatTileProps {
  label: string;
  value: string;
  context?: string;
  sampleSize?: number;
  insufficientSample?: boolean;
  hero?: boolean;
}

export function StatTile({
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
    <Card className="gap-0 py-5">
      <CardContent className="flex h-full flex-col justify-between gap-3 px-5">
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
          <p className="min-h-10 text-sm text-muted-foreground">{footer}</p>
        </div>
      </CardContent>
    </Card>
  );
}
