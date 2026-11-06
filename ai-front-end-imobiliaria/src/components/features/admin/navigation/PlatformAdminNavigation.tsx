"use client";

import {
    Building2,
    Landmark,
    Layers,
    LayoutDashboard,
    ListOrdered,
    Radar,
    Search,
    Settings,
    ShieldCheck,
    type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";

import {
    SidebarNav,
    SidebarNavDisabled,
    SidebarNavLink,
    SidebarNavSection,
} from "@/components/layout/SidebarNav";
import { TopbarTitle } from "@/components/layout/TopbarTitle";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/useAuthStore";

interface PlatformNavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    permission: string;
    isActive: (pathname: string) => boolean;
    /** Module pages, shown as tabs in the topbar while the module is open. */
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
                label: "Buscas dos usuários",
                href: "/admin/market-search",
                icon: Search,
                permission: "platform.market-search.view",
                isActive: (pathname) => pathname.startsWith("/admin/market-search"),
            },
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
                        label: "Fila",
                        href: `${crawlerRoot}/queue`,
                        icon: ListOrdered,
                        isActive: (pathname) => pathname.startsWith(`${crawlerRoot}/queue`),
                    },
                    {
                        label: "Execuções em lote",
                        href: `${crawlerRoot}/batches`,
                        icon: Layers,
                        isActive: (pathname) => pathname.startsWith(`${crawlerRoot}/batches`),
                    },
                    {
                        label: "Agências",
                        href: `${crawlerRoot}/agencies`,
                        icon: Building2,
                        // Runs and discovery snapshots belong to an agency's workflow.
                        isActive: (pathname) => startsWithAny(pathname, [
                            `${crawlerRoot}/agencies`,
                            `${crawlerRoot}/runs`,
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

                        return (
                            <SidebarNavLink active={active} href={item.href} icon={item.icon} key={item.href}>
                                {item.label}
                            </SidebarNavLink>
                        );
                    })}
                </SidebarNavSection>
            ))}

        </SidebarNav>
    );
}

/** Topbar of the platform admin: the open section's title and, for modules, its pages as tabs. */
export function PlatformAdminTopbar() {
    const pathname = usePathname();
    const item = navigationGroups
        .flatMap((group) => group.items)
        .find((candidate) => candidate.isActive(pathname));

    if (!item) return <TopbarTitle title="Administração" />;

    return (
        <TopbarTitle
            icon={item.icon}
            tabs={item.children?.map((child) => ({
                label: child.label,
                href: child.href,
                active: child.isActive(pathname),
            }))}
            tabsLabel={item.children ? `Páginas do ${item.label}` : undefined}
            title={item.label}
        />
    );
}
