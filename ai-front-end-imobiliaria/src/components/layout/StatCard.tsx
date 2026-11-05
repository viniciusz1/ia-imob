import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Icon tile of a stat: tinted background with the solid tone as the icon color. */
export const STAT_TONES = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/15 text-info",
    destructive: "bg-destructive/15 text-destructive",
    muted: "bg-secondary text-muted-foreground",
} as const;

export type StatTone = keyof typeof STAT_TONES;

/** Color of the stat value; neutral tones keep the regular text color. */
export const STAT_VALUE_TONES: Record<StatTone, string> = {
    primary: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
    destructive: "text-destructive",
    muted: "text-foreground",
};

interface StatCardProps {
    title: string;
    value: string | number;
    hint?: string;
    icon: LucideIcon;
    tone?: StatTone;
    href?: string;
}

/**
 * KPI tile after the reference dashboard stat card: label on top, then the
 * tinted icon tile next to a 24px value colored by the tone.
 * Lay them out in `grid gap-4 sm:grid-cols-2 lg:grid-cols-4`.
 */
export function StatCard({ title, value, hint, icon: Icon, tone = "primary", href }: StatCardProps) {
    const card = (
        <Card
            className={cn(
                "h-full gap-4 p-6",
                href && "transition-colors group-hover:bg-muted/40",
            )}
        >
            <p className="text-sm leading-4 font-semibold text-subtle">{title}</p>
            <div className="flex flex-wrap items-center gap-3">
                <span className={cn("flex shrink-0 items-center justify-center rounded-xl p-[9px]", STAT_TONES[tone])}>
                    <Icon className="size-5" />
                </span>
                <p className={cn("text-2xl leading-8 font-semibold tracking-[-0.01em] tabular-nums", STAT_VALUE_TONES[tone])}>
                    {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
                </p>
            </div>
            {hint && <p className="-mt-1 text-sm text-subtle">{hint}</p>}
        </Card>
    );

    if (!href) return card;

    return (
        <Link className="group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40" href={href}>
            {card}
        </Link>
    );
}
