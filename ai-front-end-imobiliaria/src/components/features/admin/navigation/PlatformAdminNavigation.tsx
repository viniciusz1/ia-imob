"use client";

import {
    ChevronLeft,
    Landmark,
    LayoutDashboard,
    Lock,
    Radar,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

interface PlatformNavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    permission: string;
    isActive: (pathname: string) => boolean;
}

interface PlatformNavGroup {
    label: string;
    items: PlatformNavItem[];
}

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
            },
        ],
    },
];

const itemClasses =
    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors";

export function PlatformAdminNavigation() {
    const pathname = usePathname();
    const permissions = useAuthStore((state) => state.user?.permissions);

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

                        const active = item.isActive(pathname);

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
