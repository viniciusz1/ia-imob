import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const STAT_TONES = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/12 text-warning",
    info: "bg-info/10 text-info",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
} as const;

export type StatTone = keyof typeof STAT_TONES;

interface StatCardProps {
    title: string;
    value: string | number;
    hint?: string;
    icon: LucideIcon;
    tone?: StatTone;
    href?: string;
}

/** KPI tile. Lay them out in `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`. */
export function StatCard({ title, value, hint, icon: Icon, tone = "primary", href }: StatCardProps) {
    const card = (
        <Card
            className={cn(
                "h-full gap-0 p-5",
                href && "transition-colors group-hover:border-primary/30 group-hover:bg-muted/30",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted-foreground">{title}</p>
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", STAT_TONES[tone])}>
                    <Icon className="size-5" />
                </span>
            </div>
            <p className="mt-2 text-3xl leading-none tracking-tight text-foreground tabular-nums">
                {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </p>
            {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
        </Card>
    );

    if (!href) return card;

    return (
        <Link className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" href={href}>
            {card}
        </Link>
    );
}
