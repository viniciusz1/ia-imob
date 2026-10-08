import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface SectionHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    icon?: LucideIcon;
    /** Optional "see all" link on the right. */
    href?: string;
    linkLabel?: string;
    /** Free-form content on the right (buttons, badges). Ignored when `href` is set. */
    actions?: ReactNode;
    /** Heading level; keep the document outline under the page h1. */
    as?: "h2" | "h3";
}

/**
 * Header row of a card that holds a list or table. Use it as the first child
 * of `<Card className="gap-0 overflow-hidden py-0">` so it spans edge to edge.
 */
export function SectionHeader({
    title,
    description,
    icon: Icon,
    href,
    linkLabel = "Ver todos",
    actions,
    as: Heading = "h2",
}: SectionHeaderProps) {
    return (
        <div className="flex items-start justify-between gap-3 border-b px-4 py-4 sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
                {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                <div className="min-w-0">
                    <Heading className="truncate text-base text-foreground">{title}</Heading>
                    {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
                </div>
            </div>
            {href ? (
                <Link
                    className="flex shrink-0 items-center gap-1 rounded-md text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    href={href}
                >
                    {linkLabel}
                    <ArrowRight className="size-3.5" />
                </Link>
            ) : (
                actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>
            )}
        </div>
    );
}
