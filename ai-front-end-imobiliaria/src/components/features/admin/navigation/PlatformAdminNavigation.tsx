"use client";

import {
    Activity,
    Building2,
    ChevronLeft,
    Landmark,
    LayoutDashboard,
    Radar,
    Search,
    Settings,
    ShieldCheck,
    type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";

import {
    SidebarNav,
    SidebarNavChild,
    SidebarNavDisabled,
    SidebarNavFooterLink,
    SidebarNavLink,
    SidebarNavModule,
    SidebarNavSection,
} from "@/components/layout/SidebarNav";
import { hasPermission } from "@/lib/permissions";
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

export function PlatformAdminNavigation() {
    const pathname = usePathname();
    const permissions = useAuthStore((state) => state.user?.permissions);

    return (
        <SidebarNav label="Navegação da plataforma">
            {navigationGroups.map((group) => (
                <SidebarNavSection key={group.label} label={group.label}>
                    {group.items.map((item) => {
                        // Items the user cannot reach stay visible but disabled. A menu
                        // that silently disappears is exactly how the Agency screens got
                        // lost; a disabled item with a stated reason is diagnosable.
                        if (!hasPermission(permissions, item.permission)) {
                            return (
                                <SidebarNavDisabled
                                    icon={item.icon}
                                    key={item.href}
                                    reason={`Requer a permissão ${item.permission}`}
                                >
                                    {item.label}
                                </SidebarNavDisabled>
                            );
                        }

                        const active = item.isActive(pathname);

                        if (item.children) {
                            return (
                                <SidebarNavModule
                                    href={item.href}
                                    icon={item.icon}
                                    key={item.href}
                                    label={item.label}
                                    open={active}
                                >
                                    {item.children.map((child) => (
                                        <SidebarNavChild
                                            active={child.isActive(pathname)}
                                            href={child.href}
                                            icon={child.icon}
                                            key={child.href}
                                        >
                                            {child.label}
                                        </SidebarNavChild>
                                    ))}
                                </SidebarNavModule>
                            );
                        }

                        return (
                            <SidebarNavLink active={active} href={item.href} icon={item.icon} key={item.href}>
                                {item.label}
                            </SidebarNavLink>
                        );
                    })}
                </SidebarNavSection>
            ))}

            <SidebarNavFooterLink href="/" icon={ChevronLeft}>
                Voltar ao CRM
            </SidebarNavFooterLink>
        </SidebarNav>
    );
}
