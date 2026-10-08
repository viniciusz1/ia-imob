"use client";

import { LayoutDashboard } from "lucide-react";
import { usePathname } from "next/navigation";

import { SidebarNav, SidebarNavLink, SidebarNavSection } from "@/components/layout/SidebarNav";
import { dashboardModules, type DashboardModule } from "@/config/modules";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/useAuthStore";

const dashboardItem: DashboardModule = {
    id: "dashboard",
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    permissions: [],
};

// Menu sections by what the user is doing, not by module order in the config.
const sections: Array<{ label?: string; moduleIds: string[] }> = [
    { moduleIds: ["dashboard"] },
    { label: "Imóveis", moduleIds: ["properties", "auctions", "ai-searcher", "valuations"] },
    { label: "Análises", moduleIds: ["market-analytics", "valuation-analytics"] },
    { label: "Gestão", moduleIds: ["users", "roles", "billing", "site-settings"] },
    { label: "Plataforma", moduleIds: ["platform-agencies", "crawler-operations"] },
];

const modulesById = new Map(
    [dashboardItem, ...dashboardModules].map((module) => [module.id, module]),
);

function isActive(module: DashboardModule, pathname: string): boolean {
    if (module.href === "/") return pathname === "/";
    return pathname === module.href || pathname.startsWith(`${module.href}/`);
}

/** CRM sidebar menu; modules the user cannot reach are left out. */
export function AppNavigation() {
    const pathname = usePathname();
    const user = useAuthStore((state) => state.user);
    const permissions = Array.isArray(user?.permissions) ? user.permissions : null;

    const canSee = (module: DashboardModule) => {
        if (module.platformOnly && user?.is_platform_admin !== true) return false;
        if (module.permissions.length === 0) return true;
        if (permissions === null) return false;
        return hasPermission(permissions, module.permissions, "any");
    };

    return (
        <SidebarNav label="Navegação principal">
            {sections.map((section) => {
                const modules = section.moduleIds
                    .map((id) => modulesById.get(id))
                    .filter((module): module is DashboardModule => module !== undefined && canSee(module));

                if (modules.length === 0) return null;

                return (
                    <SidebarNavSection key={section.label ?? "inicio"} label={section.label}>
                        {modules.map((module) => (
                            <SidebarNavLink
                                active={isActive(module, pathname)}
                                href={module.href}
                                icon={module.icon}
                                key={module.id}
                            >
                                {module.title}
                            </SidebarNavLink>
                        ))}
                    </SidebarNavSection>
                );
            })}
        </SidebarNav>
    );
}
