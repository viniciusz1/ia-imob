import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PanelCardProps {
  indicator: string;
  title: string;
  className?: string;
  children: ReactNode;
}

export function PanelCard({ indicator, title, className, children }: PanelCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-baseline justify-between gap-2 text-lg">
          <span>{title}</span>
          <span className="text-xs font-normal tabular-nums text-muted-foreground">
            {indicator}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
