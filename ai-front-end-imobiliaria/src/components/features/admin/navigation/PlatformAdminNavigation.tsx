"use client";

import {
    Activity,
    Building2,
    ChevronDown,
    ChevronLeft,
    Landmark,
    LayoutDashboard,
    Lock,
    Radar,
    Search,
    Settings,
    ShieldCheck,
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
    /** Module pages listed under the item while the module is open. */
    children?: PlatformNavChild[];
}

interface PlatformNavChild {
    label: string;
    href: string;
    icon: LucideIcon;
    isActive: (pathname: string) => boolean;
}

interface PlatformNavGroup {
    label: string;
    items: PlatformNavItem[];
}

const crawlerRoot = "/admin/crawler";

const startsWithAny = (pathname: string, prefixes: string[]) =>
    prefixes.some((prefix) => pathname.startsWith(prefix));

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
                href: crawlerRoot,
                icon: Radar,
                permission: "crawler.view",
                isActive: (pathname) => pathname.startsWith(crawlerRoot),
                children: [
                    {
                        label: "Visão geral",
                        href: crawlerRoot,
                        icon: LayoutDashboard,
                        isActive: (pathname) => pathname === crawlerRoot,
                    },
                    {
                        label: "Prospecção",
                        href: `${crawlerRoot}/prospects`,
                        icon: Search,
                        isActive: (pathname) => pathname.startsWith(`${crawlerRoot}/prospects`),
                    },
                    {
                        label: "Crawl Agencies",
                        href: `${crawlerRoot}/agencies`,
                        icon: Building2,
                        // Runs belong to an agency's workflow.
                        isActive: (pathname) => startsWithAny(pathname, [
                            `${crawlerRoot}/agencies`,
                            `${crawlerRoot}/runs`,
                        ]),
                    },
                    {
                        label: "Operações",
                        href: `${crawlerRoot}/operations`,
                        icon: Activity,
                        // A discovery snapshot is inspected from the operations queue.
                        isActive: (pathname) => startsWithAny(pathname, [
                            `${crawlerRoot}/operations`,
                            `${crawlerRoot}/discoveries`,
                        ]),
                    },
                    {
                        label: "Qualidade",
                        href: `${crawlerRoot}/quality`,
                        icon: ShieldCheck,
                        isActive: (pathname) => pathname.startsWith(`${crawlerRoot}/quality`),
                    },
                    {
                        label: "Configurações",
                        href: `${crawlerRoot}/settings`,
                        icon: Settings,
                        isActive: (pathname) => pathname.startsWith(`${crawlerRoot}/settings`),
                    },
                ],
            },
        ],
    },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60";
const itemClasses = cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", focusRing);
const activeClasses = "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm";
const inactiveClasses = "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground";

export function PlatformAdminNavigation() {
    const pathname = usePathname();
    const permissions = useAuthStore((state) => state.user?.permissions);

    return (
        <nav aria-label="Navegação da plataforma" className="flex flex-col gap-5">
            {navigationGroups.map((group) => (
                <div className="flex flex-col gap-0.5" key={group.label}>
                    <p className="px-3 pb-1.5 text-xs uppercase tracking-wide text-sidebar-muted/80">
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
                                    className={cn(itemClasses, "cursor-not-allowed text-sidebar-muted/50")}
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

                        if (item.children) {
                            return (
                                <div key={item.href}>
                                    {/* The module link opens its overview; while inside the
                                        module it reads as the open section and the child
                                        item carries the active pill. */}
                                    <Link
                                        className={cn(
                                            itemClasses,
                                            active ? "bg-sidebar-accent text-sidebar-foreground" : inactiveClasses,
                                        )}
                                        href={item.href}
                                    >
                                        <item.icon className="size-4 shrink-0" />
                                        <span className="flex-1">{item.label}</span>
                                        <ChevronDown
                                            aria-hidden="true"
                                            className={cn("size-3.5 shrink-0 transition-transform duration-200", active && "rotate-180")}
                                        />
                                    </Link>

                                    {active && (
                                        <div className="mt-0.5 mb-1 ml-4 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
                                            {item.children.map((child) => {
                                                const childActive = child.isActive(pathname);

                                                return (
                                                    <Link
                                                        aria-current={childActive ? "page" : undefined}
                                                        className={cn(
                                                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                                                            focusRing,
                                                            childActive ? activeClasses : inactiveClasses,
                                                        )}
                                                        href={child.href}
                                                        key={child.href}
                                                    >
                                                        <child.icon className="size-3.5 shrink-0" />
                                                        {child.label}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                aria-current={active ? "page" : undefined}
                                className={cn(itemClasses, active ? activeClasses : inactiveClasses)}
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

            <div className="border-t border-sidebar-border pt-3">
                <Link className={cn(itemClasses, inactiveClasses)} href="/">
                    <ChevronLeft className="size-4 shrink-0" />
                    Voltar ao CRM
                </Link>
            </div>
        </nav>
    );
}
