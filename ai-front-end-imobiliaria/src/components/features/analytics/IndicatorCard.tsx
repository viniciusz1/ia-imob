import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EMPTY_VALUE, formatCount } from "./format";

interface IndicatorCardProps {
  indicator: string;
  title: string;
  value: string;
  sampleSize?: number;
  insufficientSample?: boolean;
  hint?: string;
}

export function IndicatorCard({
  indicator,
  title,
  value,
  sampleSize,
  insufficientSample = false,
  hint,
}: IndicatorCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-baseline justify-between text-sm font-medium text-muted-foreground">
          <span>{title}</span>
          <span className="text-xs tabular-nums opacity-60">{indicator}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={cn("text-2xl font-semibold", insufficientSample && "text-muted-foreground")}>
          {insufficientSample ? EMPTY_VALUE : value}
        </p>
        {insufficientSample ? (
          <p className="text-xs text-muted-foreground">
            Amostra insuficiente ({formatCount(sampleSize)} imóveis).
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {hint ?? (sampleSize === undefined ? null : `${formatCount(sampleSize)} imóveis`)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
