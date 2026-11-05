import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Small presentational charts after the reference dashboards: a thick donut
 * with a legend list (rows split by dividers), a 24px stacked bar with 4px
 * segments, and an inline share bar for table cells. They only draw numbers
 * the screen already has; no data is fetched or derived here.
 */

export type ChartTone = "primary" | "success" | "warning" | "destructive" | "info" | "muted";

const TONE_COLOR: Record<ChartTone, string> = {
    primary: "var(--chart-1)",
    success: "var(--success)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
    info: "var(--info)",
    muted: "var(--slate)",
};

export interface ChartSegment {
    key: string;
    label: ReactNode;
    value: number;
    tone: ChartTone;
}

function totalOf(segments: ChartSegment[]): number {
    return segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
}

interface DonutChartProps {
    segments: ChartSegment[];
    /** Outer diameter in px. */
    size?: number;
    /** Accessible summary, e.g. "Crawl Agencies por ciclo de vida". */
    label: string;
}

/** Ring about 19% of the diameter thick, as in the reference donuts. */
export function DonutChart({ segments, size = 136, label }: DonutChartProps) {
    const total = totalOf(segments);
    const stroke = size * 0.19;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;

    return (
        <svg
            aria-label={label}
            className="shrink-0 -rotate-90"
            height={size}
            role="img"
            viewBox={`0 0 ${size} ${size}`}
            width={size}
        >
            <circle
                cx={size / 2}
                cy={size / 2}
                fill="none"
                r={radius}
                stroke="var(--secondary)"
                strokeWidth={stroke}
            />
            {total > 0 &&
                segments.map((segment) => {
                    const length = (Math.max(segment.value, 0) / total) * circumference;
                    const dash = `${length} ${circumference - length}`;
                    const circle = (
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            fill="none"
                            key={segment.key}
                            r={radius}
                            stroke={TONE_COLOR[segment.tone]}
                            strokeDasharray={dash}
                            strokeDashoffset={-offset}
                            strokeWidth={stroke}
                        />
                    );
                    offset += length;
                    return length > 0 ? circle : null;
                })}
        </svg>
    );
}

/** Legend of a chart: one row per segment, split by dividers, value on the right. */
export function ChartLegendList({ segments, className }: { segments: ChartSegment[]; className?: string }) {
    return (
        <ul className={cn("w-full", className)}>
            {segments.map((segment) => (
                <li
                    className="flex items-center justify-between gap-3 border-t py-3 last:border-b"
                    key={segment.key}
                >
                    <span className="flex min-w-0 items-center gap-2 text-sm leading-5">{segment.label}</span>
                    <span className="text-sm leading-4 font-semibold whitespace-nowrap text-foreground tabular-nums">
                        {segment.value.toLocaleString("pt-BR")}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** 24px bar split into rounded segments proportional to each value, with a square-dot legend. */
export function StackedBar({ segments, label }: { segments: ChartSegment[]; label: string }) {
    const total = totalOf(segments);

    return (
        <div className="space-y-3">
            <div aria-label={label} className="flex h-6 w-full gap-0.5" role="img">
                {total === 0 ? (
                    <span className="h-full flex-1 rounded-[4px] bg-secondary" />
                ) : (
                    segments
                        .filter((segment) => segment.value > 0)
                        .map((segment) => (
                            <span
                                className="h-full rounded-[4px]"
                                key={segment.key}
                                style={{ backgroundColor: TONE_COLOR[segment.tone], flexGrow: segment.value, flexBasis: 0 }}
                            />
                        ))
                )}
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
                {segments.map((segment) => (
                    <li className="flex items-center gap-2 text-[0.8125rem] text-muted-foreground" key={segment.key}>
                        <span
                            aria-hidden="true"
                            className="size-3 shrink-0 rounded-[3px]"
                            style={{ backgroundColor: TONE_COLOR[segment.tone] }}
                        />
                        {segment.label}
                        <span className="font-semibold text-foreground tabular-nums">{segment.value.toLocaleString("pt-BR")}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface ShareBarProps {
    value: number;
    /** The largest value of the column; the bar is the share of it. */
    max: number;
    tone?: ChartTone;
    className?: string;
}

/** Inline bar for a table cell, like the "Desempenho" column of the reference tables. */
export function ShareBar({ value, max, tone = "primary", className }: ShareBarProps) {
    const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;

    return (
        <span aria-hidden="true" className={cn("inline-flex h-[1.125rem] w-28 overflow-hidden rounded-[4px] bg-secondary", className)}>
            <span className="h-full rounded-[4px]" style={{ width: `${share * 100}%`, backgroundColor: TONE_COLOR[tone] }} />
        </span>
    );
}
