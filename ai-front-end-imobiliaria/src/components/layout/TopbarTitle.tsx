import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface TopbarTab {
    label: string;
    href: string;
    active: boolean;
}

interface TopbarTitleProps {
    icon?: LucideIcon;
    title: string;
    /** Pages of the module, shown as a segmented control next to the title. */
    tabs?: TopbarTab[];
    tabsLabel?: string;
}

/**
 * Module title of the topbar (green icon + name) and, when the module has
 * pages, the segmented tabs that switch between them.
 */
export function TopbarTitle({ icon: Icon, title, tabs, tabsLabel }: TopbarTitleProps) {
    const hasTabs = tabs !== undefined && tabs.length > 0;

    return (
        <div className="flex min-w-0 items-center gap-6">
            <div className={cn("min-w-0 items-center gap-2.5", hasTabs ? "hidden xl:flex" : "flex")}>
                {Icon && <Icon aria-hidden="true" className="size-7 shrink-0 text-sidebar-highlight" strokeWidth={2.25} />}
                <p className="truncate text-[1.625rem] leading-none font-semibold tracking-tight">{title}</p>
            </div>

            {hasTabs && (
                <nav
                    aria-label={tabsLabel ?? title}
                    className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl bg-segment p-1.5"
                >
                    {tabs.map((tab) => (
                        <Link
                            aria-current={tab.active ? "page" : undefined}
                            className={cn(
                                "flex h-8 shrink-0 items-center rounded-lg px-3 text-[0.8125rem] font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                                tab.active
                                    ? "bg-segment-active text-segment-active-foreground shadow-xs"
                                    : "text-segment-foreground hover:text-foreground",
                            )}
                            href={tab.href}
                            key={tab.href}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>
            )}
        </div>
    );
}
