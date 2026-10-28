"use client";

import {
    Building2,
    ChevronDown,
    ChevronLeft,
    Landmark,
    LayoutDashboard,
    ListOrdered,
    Lock,
    Radar,
    Search,
    Settings,
    ShieldCheck,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface PlatformNavSubItem {
    label: string;
    href: string;
    icon: LucideIcon;
    permission: string;
    isActive: (pathname: string) => boolean;
    ariaLabel?: string;
}

interface PlatformNavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    permission: string;
    isActive: (pathname: string) => boolean;
    subItems?: PlatformNavSubItem[];
}

interface PlatformNavGroup {
    label: string;
    items: PlatformNavItem[];
}

const crawlerSubItems: PlatformNavSubItem[] = [
    { label: "Execuções em lote", href: "/admin/crawler/batches", icon: ListOrdered, permission: "crawler.view",
      isActive: (pathname) => pathname.startsWith("/admin/crawler/batches") },
    {
        label: "Visão geral",
        href: "/admin/crawler",
        icon: LayoutDashboard,
        permission: "crawler.view",
        isActive: (pathname) => pathname === "/admin/crawler",
        ariaLabel: "Visão geral do Crawler",
    },
    {
        label: "Prospecção",
        href: "/admin/crawler/prospects",
        icon: Search,
        permission: "crawler.view",
        isActive: (pathname) => pathname.startsWith("/admin/crawler/prospects"),
    },
    {
        label: "Fila",
        href: "/admin/crawler/queue",
        icon: ListOrdered,
        permission: "crawler.view",
        isActive: (pathname) => pathname.startsWith("/admin/crawler/queue"),
    },
    {
        label: "Crawl Agencies",
        href: "/admin/crawler/agencies",
        icon: Building2,
        permission: "crawler.view",
        isActive: (pathname) => [
            "/admin/crawler/agencies",
            "/admin/crawler/runs",
            "/admin/crawler/discoveries",
        ].some((prefix) => pathname.startsWith(prefix)),
    },
    {
        label: "Qualidade",
        href: "/admin/crawler/quality",
        icon: ShieldCheck,
        permission: "crawler.view",
        isActive: (pathname) => pathname.startsWith("/admin/crawler/quality"),
    },
    {
        label: "Configurações",
        href: "/admin/crawler/settings",
        icon: Settings,
        permission: "crawler.view",
        isActive: (pathname) => pathname.startsWith("/admin/crawler/settings"),
    },
];

// Grouped by what the Platform Admin governs, not by module: an Agency (a
// customer imobiliária) and a Crawl Agency (a scrape target) are unrelated
// entities, and grouping them under one "agencies" heading is what made the
// Agency administration screens unreachable in the first place.
const navigationGroups: PlatformNavGroup[] = [
    {
        label: "Clientes",
        items: [
            {
                label: "Visão geral",
                href: "/admin",
                icon: LayoutDashboard,
                permission: "platform.agencies.view",
                isActive: (pathname) => pathname === "/admin",
            },
            {
                label: "Agências",
                href: "/admin/agencies",
                icon: Landmark,
                permission: "platform.agencies.view",
                isActive: (pathname) => pathname.startsWith("/admin/agencies"),
            },
        ],
    },
    {
        label: "Dados de mercado",
        items: [
            {
                label: "Crawler",
                href: "/admin/crawler",
                icon: Radar,
                permission: "crawler.view",
                isActive: (pathname) => pathname.startsWith("/admin/crawler"),
                subItems: crawlerSubItems,
            },
        ],
    },
];

const itemClasses =
    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors";
const subItemClasses =
    "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors";

export function PlatformAdminNavigation() {
    const pathname = usePathname();
    const permissions = useAuthStore((state) => state.user?.permissions);

    const [userToggles, setUserToggles] = useState<Record<string, boolean>>({});
    const [lastPathname, setLastPathname] = useState(pathname);
    const [pendingHref, setPendingHref] = useState<string | null>(null);

    if (lastPathname !== pathname) {
        setLastPathname(pathname);
        setPendingHref(null);
    }

    const currentPath = pendingHref ?? pathname;

    const toggleMenu = (href: string, currentlyExpanded: boolean) => {
        setUserToggles((prev) => ({
            ...prev,
            [href]: !currentlyExpanded,
        }));
    };

    return (
        <nav
            aria-label="Navegação da plataforma"
            className="flex flex-1 flex-col gap-6 p-3 pb-6"
        >
            {navigationGroups.map((group) => (
                <div className="flex flex-col gap-0.5" key={group.label}>
                    <p className="px-2 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                    </p>

                    {group.items.map((item) => {
                        const allowed = hasPermission(permissions, item.permission);

                        // Items the user cannot reach stay visible but disabled. A menu
                        // that silently disappears is exactly how the Agency screens got
                        // lost; a disabled item with a stated reason is diagnosable.
                        if (!allowed) {
                            return (
                                <span
                                    aria-disabled="true"
                                    className={cn(itemClasses, "cursor-not-allowed text-muted-foreground/60")}
                                    key={item.href}
                                    title={`Requer a permissão ${item.permission}`}
                                >
                                    <item.icon className="size-4 shrink-0" />
                                    {item.label}
                                    <Lock aria-hidden="true" className="ml-auto size-3" />
                                </span>
                            );
                        }

                        if (item.subItems && item.subItems.length > 0) {
                            const isExpanded = userToggles[item.href] ?? item.isActive(currentPath);
                            const active = item.isActive(currentPath);
                            const submenuId = `submenu-${item.label.toLowerCase().replace(/\s+/g, "-")}`;

                            return (
                                <div className="flex flex-col gap-0.5" key={item.href}>
                                    <button
                                        aria-controls={submenuId}
                                        aria-expanded={isExpanded}
                                        className={cn(
                                            itemClasses,
                                            "w-full justify-between text-foreground/80 hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            active && "bg-sidebar-accent/60 font-semibold text-foreground",
                                        )}
                                        onClick={() => toggleMenu(item.href, isExpanded)}
                                        type="button"
                                    >
                                        <span className="flex items-center gap-2.5">
                                            <item.icon className="size-4 shrink-0" />
                                            <span>{item.label}</span>
                                        </span>
                                        <ChevronDown
                                            aria-hidden="true"
                                            className={cn(
                                                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                                                !isExpanded && "-rotate-90",
                                            )}
                                        />
                                    </button>

                                    {isExpanded && (
                                        <div
                                            className="ml-3.5 flex flex-col gap-0.5 border-l border-sidebar-border py-0.5 pl-2.5"
                                            id={submenuId}
                                        >
                                            {item.subItems.map((subItem) => {
                                                const subAllowed = hasPermission(permissions, subItem.permission);
                                                if (!subAllowed) {
                                                    return (
                                                        <span
                                                            aria-disabled="true"
                                                            className={cn(
                                                                subItemClasses,
                                                                "cursor-not-allowed text-muted-foreground/60",
                                                            )}
                                                            key={subItem.href}
                                                            title={`Requer a permissão ${subItem.permission}`}
                                                        >
                                                            <subItem.icon className="size-3.5 shrink-0" />
                                                            {subItem.label}
                                                            <Lock aria-hidden="true" className="ml-auto size-2.5" />
                                                        </span>
                                                    );
                                                }

                                                const subActive = subItem.isActive(currentPath);

                                                return (
                                                    <Link
                                                        aria-current={subActive ? "page" : undefined}
                                                        aria-label={subItem.ariaLabel}
                                                        className={cn(
                                                            subItemClasses,
                                                            "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                            subActive && "bg-sidebar-accent font-semibold text-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]",
                                                        )}
                                                        href={subItem.href}
                                                        key={subItem.href}
                                                        onClick={() => setPendingHref(subItem.href)}
                                                    >
                                                        <subItem.icon className="size-3.5 shrink-0" />
                                                        {subItem.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const active = item.isActive(currentPath);

                        return (
                            <Link
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    itemClasses,
                                    "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    active && "bg-sidebar-accent font-semibold text-foreground shadow-[inset_2px_0_0_var(--sidebar-primary)]",
                                )}
                                href={item.href}
                                key={item.href}
                                onClick={() => setPendingHref(item.href)}
                            >
                                <item.icon className="size-4 shrink-0" />
                                {item.label}
                            </Link>
                        );
                    })}
                </div>
            ))}

            <div className="mt-auto border-t pt-3">
                <Link
                    className={cn(
                        itemClasses,
                        "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    href="/"
                >
                    <ChevronLeft className="size-4 shrink-0" />
                    Voltar ao CRM
                </Link>
            </div>
        </nav>
    );
}
