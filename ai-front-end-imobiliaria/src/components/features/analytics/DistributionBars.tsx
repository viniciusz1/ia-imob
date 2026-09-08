import type { IndicatorItem } from "@/types/analytics";
import { formatCount, formatShare } from "./format";

interface DistributionBarsProps {
  items: IndicatorItem[];
  limit?: number;
  emptyMessage?: string;
}

export function DistributionBars({
  items,
  limit = 10,
  emptyMessage = "Sem imóveis neste recorte.",
}: DistributionBarsProps) {
  const visible = items.slice(0, limit);
  const largest = visible.reduce((max, item) => Math.max(max, item.count), 0);

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {visible.map((item) => (
        <div key={item.key ?? item.label} className="space-y-1.5">
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
      ))}
    </div>
  );
}
