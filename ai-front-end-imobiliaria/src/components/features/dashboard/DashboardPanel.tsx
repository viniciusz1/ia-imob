import { ArrowRight, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
    icon: LucideIcon;
    title: string;
    /** Destination of the panel title, like the product name on the reference home. */
    href?: string;
    /** Accessible name of the title link when it differs from the visible title. */
    linkLabel?: string;
    description?: string;
    /** Small link on the right of the header ("Ver todos"). */
    action?: { href: string; label: string };
    className?: string;
    children: ReactNode;
}

/** A product panel of the home: branded title, a short summary and its shortcuts. */
export function DashboardPanel({
    icon: Icon,
    title,
    href,
    linkLabel,
    description,
    action,
    className,
    children,
}: DashboardPanelProps) {
    const heading = (
        <span className="flex min-w-0 items-center gap-3">
            <Icon aria-hidden="true" className="size-6 shrink-0 text-sidebar-highlight" strokeWidth={2} />
            <span className="truncate text-xl leading-6 font-semibold tracking-[-0.01em] text-foreground">{title}</span>
        </span>
    );

    return (
        <Card className={cn("gap-5 py-0", className)}>
            <div className="px-6 pt-6 sm:px-8 sm:pt-7">
                <div className="flex items-center justify-between gap-3">
                    {href ? (
                        <Link
                            aria-label={linkLabel ?? title}
                            className="group/title inline-flex min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [&_span_span]:transition-colors hover:[&_span_span]:text-primary"
                            href={href}
                        >
                            {heading}
                        </Link>
                    ) : (
                        <h2 className="min-w-0">{heading}</h2>
                    )}
                    {action && (
                        <Link
                            className="group/action flex shrink-0 items-center gap-1 rounded-md text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            href={action.href}
                        >
                            {action.label}
                            <ArrowRight className="size-3.5 transition-transform group-hover/action:translate-x-0.5" />
                        </Link>
                    )}
                </div>
                {description && <p className="mt-2 pl-9 text-sm leading-4 font-semibold text-subtle">{description}</p>}
            </div>
            <div className="flex flex-1 flex-col gap-3 px-6 pb-6 sm:px-8 sm:pb-7">{children}</div>
        </Card>
    );
}

interface DashboardLinkRowProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description?: string;
    /** Accessible name when it should differ from the visible title. */
    label?: string;
    /** Value shown on the right, e.g. a count. */
    meta?: ReactNode;
    tone?: "primary" | "muted";
}

/** Shortcut row: icon tile, title and description, chevron that nudges on hover. */
export function DashboardLinkRow({ href, icon: Icon, title, description, label, meta, tone = "muted" }: DashboardLinkRowProps) {
    return (
        <Link
            aria-label={label}
            className="group/row flex items-center gap-3.5 rounded-xl bg-muted px-4 py-3.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            href={href}
        >
            <span
                className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    tone === "primary" ? "bg-primary/15 text-primary" : "bg-card text-muted-foreground group-hover/row:text-primary",
                )}
            >
                <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
                {description && <span className="mt-0.5 block truncate text-[0.8125rem] text-subtle">{description}</span>}
            </span>
            {meta !== undefined && <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{meta}</span>}
            <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary"
            />
        </Link>
    );
}

/** Big number with its caption, used at the top of a panel. */
export function DashboardFigure({ value, caption, loading }: { value: string; caption: string; loading?: boolean }) {
    return (
        <div className="rounded-xl bg-muted px-5 py-4">
            <p className="text-[0.8125rem] leading-4 font-semibold text-subtle">{caption}</p>
            {loading ? (
                <span className="mt-2 block h-8 w-24 animate-pulse rounded-md bg-secondary" />
            ) : (
                <p className="mt-2 text-[1.75rem] leading-8 font-semibold tracking-[-0.01em] text-foreground tabular-nums">{value}</p>
            )}
        </div>
    );
}
