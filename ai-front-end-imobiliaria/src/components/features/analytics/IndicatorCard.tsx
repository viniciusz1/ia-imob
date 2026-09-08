import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2">
          <span className="text-sm text-muted-foreground">{title}</span>
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {indicator}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className={cn("text-2xl font-bold tracking-tight", insufficientSample && "text-muted-foreground")}>
          {insufficientSample ? EMPTY_VALUE : value}
        </p>
        <CardDescription>
          {insufficientSample
            ? `Amostra insuficiente (${formatCount(sampleSize)} imóveis).`
            : (hint ?? (sampleSize === undefined ? null : `${formatCount(sampleSize)} imóveis`))}
        </CardDescription>
      </CardContent>
    </Card>
  );
}
