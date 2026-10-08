import { ChevronDown, Lock, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60";
const itemClasses = cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", focusRing);
const childClasses = cn("flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors", focusRing);
const activeClasses = "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm";
const inactiveClasses = "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground";

/** Root of a sidebar menu: labelled sections stacked with a fixed rhythm. */
export function SidebarNav({ label, children }: { label: string; children: ReactNode }) {
    return (
        <nav aria-label={label} className="flex flex-col gap-5">
            {children}
        </nav>
    );
}

export function SidebarNavSection({ label, children }: { label?: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            {label && <p className="px-3 pb-1.5 text-xs uppercase tracking-wide text-sidebar-muted/80">{label}</p>}
            {children}
        </div>
    );
}

interface SidebarNavLinkProps {
    href: string;
    icon: LucideIcon;
    active: boolean;
    children: ReactNode;
}

/** Top-level item; the active one is a white pill. */
export function SidebarNavLink({ href, icon: Icon, active, children }: SidebarNavLinkProps) {
    return (
        <Link
            aria-current={active ? "page" : undefined}
            className={cn(itemClasses, active ? activeClasses : inactiveClasses)}
            href={href}
        >
            <Icon className="size-4 shrink-0" />
            {children}
        </Link>
    );
}

/** Item the user cannot reach: visible, disabled, with the reason as a tooltip. */
export function SidebarNavDisabled({ icon: Icon, reason, children }: { icon: LucideIcon; reason: string; children: ReactNode }) {
    return (
        <span aria-disabled="true" className={cn(itemClasses, "cursor-not-allowed text-sidebar-muted/50")} title={reason}>
            <Icon className="size-4 shrink-0" />
            {children}
            <Lock aria-hidden="true" className="ml-auto size-3" />
        </span>
    );
}

interface SidebarNavModuleProps {
    href: string;
    icon: LucideIcon;
    label: string;
    /** True while the current route is inside the module; expands the children. */
    open: boolean;
    children: ReactNode;
}

/**
 * Module entry with its pages listed underneath while the module is open. The
 * module link reads as the open section; the child item carries the pill.
 */
export function SidebarNavModule({ href, icon: Icon, label, open, children }: SidebarNavModuleProps) {
    return (
        <div>
            <Link
                className={cn(itemClasses, open ? "bg-sidebar-accent text-sidebar-foreground" : inactiveClasses)}
                href={href}
            >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{label}</span>
                <ChevronDown
                    aria-hidden="true"
                    className={cn("size-3.5 shrink-0 transition-transform duration-200", open && "rotate-180")}
                />
            </Link>
            {open && (
                <div className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                    {children}
                </div>
            )}
        </div>
    );
}

export function SidebarNavChild({ href, icon: Icon, active, children }: SidebarNavLinkProps) {
    return (
        <Link
            aria-current={active ? "page" : undefined}
            className={cn(childClasses, active ? activeClasses : inactiveClasses)}
            href={href}
        >
            <Icon className="size-3.5 shrink-0" />
            {children}
        </Link>
    );
}

/** Divider-separated link at the bottom of the menu (e.g. switching areas). */
export function SidebarNavFooterLink({ href, icon: Icon, children }: { href: string; icon: LucideIcon; children: ReactNode }) {
    return (
        <div className="border-t border-sidebar-border pt-3">
            <Link className={cn(itemClasses, inactiveClasses)} href={href}>
                <Icon className="size-4 shrink-0" />
                {children}
            </Link>
        </div>
    );
}
