"use client";

import { ArrowRight, ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId, type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DashboardPanelProps {
    icon: LucideIcon;
    title: string;
    /** Destination of the panel title, like the product name on the reference home. */
    href?: string;
    description?: string;
    /** Small link on the right of the header ("Ver todos"). */
    action?: { href: string; label: string };
    className?: string;
    children: ReactNode;
}

/**
 * A block of the home: green icon + title (a link to the module), a grey
 * subtitle and an optional "Ver …" link. The body runs edge to edge so lists
 * and tables can draw their dividers across the card; padded content wraps
 * itself in `DashboardPanelBody`.
 */
export function DashboardPanel({ icon: Icon, title, href, description, action, className, children }: DashboardPanelProps) {
    const heading = (
        <span className="flex min-w-0 items-center gap-3">
            <Icon aria-hidden="true" className="size-6 shrink-0 text-sidebar-highlight" strokeWidth={2} />
            <span className="truncate text-xl leading-6 font-semibold tracking-[-0.01em] text-foreground">{title}</span>
        </span>
    );

    return (
        <Card className={cn("gap-0 overflow-hidden py-0", className)}>
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-5 sm:px-8 sm:pt-7">
                <div className="min-w-0">
                    <h2 className="min-w-0">
                        {href ? (
                            <Link
                                className="group/title inline-flex min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 hover:[&_span_span]:text-primary"
                                href={href}
                            >
                                {heading}
                            </Link>
                        ) : (
                            heading
                        )}
                    </h2>
                    {description && <p className="mt-2 pl-9 text-sm leading-4 font-semibold text-subtle">{description}</p>}
                </div>
                {action && (
                    <Link
                        className="group/action mt-0.5 flex shrink-0 items-center gap-1 rounded-md text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                        href={action.href}
                    >
                        {action.label}
                        <ArrowRight className="size-3.5 transition-transform group-hover/action:translate-x-0.5" />
                    </Link>
                )}
            </div>
            {/* Fills the card, so cards stretched to a row's height keep their content spread. */}
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
        </Card>
    );
}

/** Padded body of a panel, aligned with the header. */
export function DashboardPanelBody({ className, children }: { className?: string; children: ReactNode }) {
    return <div className={cn("px-6 pb-6 sm:px-8 sm:pb-7", className)}>{children}</div>;
}

/**
 * Edge-to-edge list with dividers between rows, closing the card at the bottom.
 * With `fill`, the rows share the card's remaining height evenly, so a shorter
 * list in a stretched card still ends on the card's bottom edge.
 */
export function DashboardList({ children, label, fill = false }: { children: ReactNode; label?: string; fill?: boolean }) {
    return (
        <ul
            aria-label={label}
            className={cn("divide-y border-t", fill && "flex flex-1 flex-col [&>li]:flex [&>li]:flex-1 [&>li>*]:flex-1")}
        >
            {children}
        </ul>
    );
}

interface DashboardShortcutProps {
    href: string;
    icon: LucideIcon;
    title: string;
    description?: string;
}

/** Shortcut tile of the "Atalhos" grid: 36px tinted icon, 12px gap, one-line title, chevron. */
export function DashboardShortcutTile({ href, icon: Icon, title, description }: DashboardShortcutProps) {
    const descriptionId = useId();

    return (
        <Link
            aria-describedby={description ? descriptionId : undefined}
            aria-label={title}
            className="group/tile flex h-full min-w-0 items-center gap-3 rounded-xl bg-muted px-4 py-3.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            href={href}
            title={description}
        >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <Icon aria-hidden="true" className="size-[1.125rem]" />
            </span>
            <span className="line-clamp-2 min-w-0 flex-1 text-sm leading-5 font-semibold text-foreground">{title}</span>
            {description && (
                <span className="sr-only" id={descriptionId}>
                    {description}
                </span>
            )}
            <ChevronRight
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/tile:translate-x-0.5 group-hover/tile:text-primary"
            />
        </Link>
    );
}

/** Compact shortcut row: 36px icon tile, 12px gap, title + one line, chevron. */
export function DashboardShortcut({ href, icon: Icon, title, description }: DashboardShortcutProps) {
    const descriptionId = useId();

    return (
        <li>
            <Link
                aria-describedby={description ? descriptionId : undefined}
                aria-label={title}
                className="group/row flex items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:px-8"
                href={href}
            >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                    <Icon aria-hidden="true" className="size-[1.125rem]" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{title}</span>
                    {description && (
                        <span className="block truncate text-[0.8125rem] leading-5 text-subtle" id={descriptionId}>
                            {description}
                        </span>
                    )}
                </span>
                <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-primary"
                />
            </Link>
        </li>
    );
}

/** Placeholder rows while a list loads. */
export function DashboardListSkeleton({ rows, withThumb = false }: { rows: number; withThumb?: boolean }) {
    return (
        <ul aria-hidden="true" className="divide-y border-t">
            {Array.from({ length: rows }).map((_, index) => (
                <li className="flex items-center gap-3 px-6 py-3.5 sm:px-8" key={index}>
                    {withThumb && <span className="size-14 shrink-0 animate-pulse rounded-lg bg-muted" />}
                    <span className="flex-1 space-y-2">
                        <span className="block h-3.5 w-2/3 animate-pulse rounded bg-muted" />
                        <span className="block h-3 w-1/3 animate-pulse rounded bg-muted" />
                    </span>
                    <span className="h-4 w-20 shrink-0 animate-pulse rounded bg-muted" />
                </li>
            ))}
        </ul>
    );
}

/** One-line message in place of a list (empty or failed). */
export function DashboardListMessage({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
    return (
        <div className="flex items-center gap-3 border-t px-6 py-6 text-sm text-muted-foreground sm:px-8">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon aria-hidden="true" className="size-[1.125rem]" />
            </span>
            {children}
        </div>
    );
}
