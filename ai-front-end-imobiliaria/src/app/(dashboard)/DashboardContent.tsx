"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { STAT_TONES, type StatTone } from "@/components/layout/StatCard";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { hasPermission } from "@/lib/permissions";
import { dashboardModules, type DashboardModule } from "@/config/modules";
import { cn } from "@/lib/utils";

// Same grouping as the sidebar (AppNavigation), so the home mirrors the menu.
const sections: Array<{ label: string; moduleIds: string[] }> = [
    { label: "Imóveis", moduleIds: ["properties", "auctions", "ai-searcher", "valuations"] },
    { label: "Análises", moduleIds: ["market-analytics", "valuation-analytics"] },
    { label: "Gestão", moduleIds: ["users", "roles", "billing", "site-settings"] },
    { label: "Plataforma", moduleIds: ["platform-agencies", "crawler-operations"] },
];

// Tone per module: primary for the core work, success for money and value,
// warning for time-sensitive or access-sensitive areas, info for search and data.
const moduleTones: Record<string, StatTone> = {
    properties: "primary",
    auctions: "warning",
    "ai-searcher": "info",
    valuations: "success",
    "market-analytics": "info",
    "valuation-analytics": "success",
    users: "primary",
    roles: "warning",
    billing: "success",
    "site-settings": "info",
    "platform-agencies": "primary",
    "crawler-operations": "info",
};

// Short descriptions for modules that have none in the module config.
const fallbackDescriptions: Record<string, string> = {
    users: "Convide pessoas da equipe e gerencie os acessos.",
    roles: "Defina grupos e as permissões de cada um.",
    billing: "Acompanhe seu plano e sua assinatura.",
    "site-settings": "Personalize o site público da imobiliária.",
};

const modulesById = new Map(dashboardModules.map((module) => [module.id, module]));

function ModuleCard({ module }: { module: DashboardModule }) {
    const title = module.dashboard?.title ?? module.title;
    const description = module.dashboard?.description ?? fallbackDescriptions[module.id];
    const tone = moduleTones[module.id] ?? "primary";

    return (
        <Link
            aria-label={title}
            className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            href={module.href}
        >
            <Card className="h-full min-h-44 gap-0 p-6 transition-[border-color,box-shadow] group-hover:border-primary/30 group-hover:shadow-sm">
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", STAT_TONES[tone])}>
                    <module.icon className="size-6" />
                </span>
                <p className="mt-5 text-lg text-foreground">{title}</p>
                {description && (
                    <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
                )}
                <span className="mt-auto flex items-center gap-1 pt-5 text-sm text-primary">
                    Acessar
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
            </Card>
        </Link>
    );
}

export function DashboardContent() {
    const user = useAuthStore((state) => state.user);
    const userPermissions = Array.isArray(user?.permissions) ? user.permissions : null;
    const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";

    const canSee = (module: DashboardModule) => {
        if (module.platformOnly && user?.is_platform_admin !== true) {
            return false;
        }

        if (module.permissions.length === 0) {
            return true;
        }

        if (userPermissions === null) return false;

        return hasPermission(userPermissions, module.permissions, "any");
    };

    const visibleSections = sections
        .map((section) => ({
            label: section.label,
            modules: section.moduleIds
                .map((id) => modulesById.get(id))
                .filter((module): module is DashboardModule => module !== undefined && canSee(module)),
        }))
        .filter((section) => section.modules.length > 0);

    return (
        <div className="space-y-6">
            <PageHeader
                description="Bem-vindo ao IA Imob. Escolha por onde começar."
                title={firstName ? `Olá, ${firstName}` : "Olá!"}
            />

            {visibleSections.map((section) => (
                <section className="space-y-3" key={section.label}>
                    <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{section.label}</h2>
                    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {section.modules.map((module) => (
                            <ModuleCard key={module.id} module={module} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
