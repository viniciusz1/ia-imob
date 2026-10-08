"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
    /** Label for each URL segment, e.g. `{ admin: "Administração" }`. */
    labels: Record<string, string>;
    /** Labels for full paths, winning over segment labels, e.g. `{ "/admin/crawler/agencies": "Crawl Agencies" }`. */
    pathLabels?: Record<string, string>;
    /** Shown alone when the current page is the root (`/`). */
    rootLabel?: string;
    /** Paths that only group routes and have no page of their own. */
    unlinkedPaths?: RegExp[];
}

// Numeric ids and UUIDs become "Detalhes" instead of leaking into the trail.
const ID_SEGMENT = /^(\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

function labelFor(segment: string, labels: Record<string, string>): string {
    if (labels[segment]) return labels[segment];
    if (ID_SEGMENT.test(segment)) return "Detalhes";
    const words = decodeURIComponent(segment).replace(/[-_]/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Path-derived breadcrumb trail for the topbar. */
export function Breadcrumbs({ labels, pathLabels = {}, rootLabel, unlinkedPaths = [] }: BreadcrumbsProps) {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    const crumbs = segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`;
        return {
            href,
            label: pathLabels[href] ?? labelFor(segment, labels),
            linkable: !unlinkedPaths.some((pattern) => pattern.test(href)),
        };
    });

    if (crumbs.length === 0 && rootLabel) {
        crumbs.push({ href: "/", label: rootLabel, linkable: false });
    }

    return (
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;

                return (
                    <span
                        className={cn("items-center gap-1.5", isLast ? "flex min-w-0" : "hidden sm:flex")}
                        key={crumb.href}
                    >
                        {index > 0 && (
                            <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:block" />
                        )}
                        {isLast ? (
                            <span aria-current="page" className="truncate text-foreground">
                                {crumb.label}
                            </span>
                        ) : crumb.linkable ? (
                            <Link className="text-muted-foreground transition-colors hover:text-foreground" href={crumb.href}>
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className="text-muted-foreground">{crumb.label}</span>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
