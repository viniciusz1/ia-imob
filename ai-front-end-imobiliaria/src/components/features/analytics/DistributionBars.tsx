import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IndicatorItem } from "@/types/analytics";
import { formatCount, formatShare } from "./format";

interface DistributionBarsProps {
  indicator: string;
  title: string;
  items: IndicatorItem[];
  limit?: number;
  emptyMessage?: string;
}

export function DistributionBars({
  indicator,
  title,
  items,
  limit = 10,
  emptyMessage = "Sem imóveis neste recorte.",
}: DistributionBarsProps) {
  const visible = items.slice(0, limit);
  const largest = visible.reduce((max, item) => Math.max(max, item.count), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-baseline justify-between text-sm font-medium">
          <span>{title}</span>
          <span className="text-xs tabular-nums text-muted-foreground">{indicator}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          visible.map((item) => (
            <div key={item.key ?? item.label} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatCount(item.count)} · {formatShare(item.share)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: largest === 0 ? "0%" : `${(item.count / largest) * 100}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
