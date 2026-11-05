"use client";

import { Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * True while the sidebar is the narrow icon rail. AppShell provides it; the
 * nav items read it to show only the icon (label kept for screen readers and
 * shown as a tooltip) or the icon with its label.
 */
export const SidebarCollapsedContext = createContext(false);

export function useSidebarCollapsed() {
    return useContext(SidebarCollapsedContext);
}

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60";
// Rail buttons are 44px tiles with 22px icons, the size used by the reference.
const railItemClasses = cn("mx-auto flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors", focusRing);
const wideItemClasses = cn("flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors", focusRing);
// Selected item: green-tinted tile with the icon in bright green.
const activeClasses = "bg-sidebar-primary text-sidebar-primary-foreground [&>svg]:text-sidebar-highlight";
const inactiveClasses = "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground";

/** Root of a sidebar menu: groups stacked with a fixed rhythm. */
export function SidebarNav({ label, children }: { label: string; children: ReactNode }) {
    const collapsed = useSidebarCollapsed();
    return (
        <nav aria-label={label} className={cn("flex flex-col", collapsed ? "gap-3" : "gap-5")}>
            {children}
        </nav>
    );
}

/** A group of items. In the rail, groups are split by a short divider instead of a label. */
export function SidebarNavSection({ label, children }: { label?: string; children: ReactNode }) {
    const collapsed = useSidebarCollapsed();

    if (collapsed) {
        return (
            <div className="flex flex-col gap-1 [&:not(:first-child)]:before:mx-auto [&:not(:first-child)]:before:mb-2 [&:not(:first-child)]:before:block [&:not(:first-child)]:before:h-px [&:not(:first-child)]:before:w-10 [&:not(:first-child)]:before:bg-sidebar-border">
                {children}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1">
            {label && <p className="px-3 pb-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-sidebar-muted/70">{label}</p>}
            {children}
        </div>
    );
}

/** Wraps a rail item with a tooltip carrying its label. */
function RailTooltip({ label, children }: { label: ReactNode; children: ReactNode }) {
    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>{children}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                    {label}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

interface SidebarNavLinkProps {
    href: string;
    icon: LucideIcon;
    active: boolean;
    children: ReactNode;
    onClick?: () => void;
}

export function SidebarNavLink({ href, icon: Icon, active, children, onClick }: SidebarNavLinkProps) {
    const collapsed = useSidebarCollapsed();

    if (collapsed) {
        return (
            <RailTooltip label={children}>
                <Link
                    aria-current={active ? "page" : undefined}
                    className={cn(railItemClasses, active ? activeClasses : inactiveClasses)}
                    href={href}
                    onClick={onClick}
                >
                    <Icon className="size-[1.375rem]" strokeWidth={1.75} />
                    <span className="sr-only">{children}</span>
                </Link>
            </RailTooltip>
        );
    }

    return (
        <Link
            aria-current={active ? "page" : undefined}
            className={cn(wideItemClasses, active ? activeClasses : inactiveClasses)}
            href={href}
            onClick={onClick}
        >
            <Icon className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="truncate">{children}</span>
        </Link>
    );
}

/** Item the user cannot reach: visible, disabled, with the reason as a tooltip. */
export function SidebarNavDisabled({ icon: Icon, reason, children }: { icon: LucideIcon; reason: string; children: ReactNode }) {
    const collapsed = useSidebarCollapsed();

    if (collapsed) {
        return (
            <span aria-disabled="true" className={cn(railItemClasses, "relative cursor-not-allowed text-sidebar-muted/40")} title={reason}>
                <Icon className="size-[1.375rem]" strokeWidth={1.75} />
                <span className="sr-only">{children}</span>
                <Lock aria-hidden="true" className="absolute right-1.5 bottom-1.5 size-2.5" />
            </span>
        );
    }

    return (
        <span aria-disabled="true" className={cn(wideItemClasses, "cursor-not-allowed text-sidebar-muted/40")} title={reason}>
            <Icon className="size-5 shrink-0" strokeWidth={1.75} />
            {children}
            <Lock aria-hidden="true" className="ml-auto size-3" />
        </span>
    );
}

/** Divider-separated link at the bottom of the menu (e.g. switching areas). */
export function SidebarNavFooterLink({ href, icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
    return (
        <div className="border-t border-sidebar-border pt-3">
            <SidebarNavLink active={false} href={href} icon={icon}>
                {children}
            </SidebarNavLink>
        </div>
    );
}

interface SidebarBrandFrameProps {
    href: string;
    /** The rendered product mark (icon tile). */
    mark: ReactNode;
    title: string;
    caption?: string;
}

/** Client half of SidebarBrand: shows the name next to the mark unless the rail is collapsed. */
export function SidebarBrandFrame({ href, mark, title, caption }: SidebarBrandFrameProps) {
    const collapsed = useSidebarCollapsed();

    return (
        <Link
            aria-label={collapsed ? title : undefined}
            className={cn("flex min-w-0 items-center gap-3 rounded-lg", focusRing)}
            href={href}
        >
            {mark}
            {!collapsed && (
                <span className="min-w-0">
                    <span className="block truncate text-base leading-tight font-semibold text-sidebar-foreground">{title}</span>
                    {caption && <span className="block truncate text-xs text-sidebar-muted">{caption}</span>}
                </span>
            )}
        </Link>
    );
}
