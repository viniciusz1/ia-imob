"use client";

import {
    BarChart3,
    Bot,
    Building2,
    Calculator,
    ClipboardList,
    CreditCard,
    Gavel,
    Globe,
    Landmark,
    Plus,
    Radar,
    ShieldCheck,
    Sparkles,
    Users,
    Zap,
    type LucideIcon,
} from "lucide-react";

import {
    AuctionsBlock,
    NewPropertiesBlock,
    PlatformBlock,
    ValuationsBlock,
    type PlatformLink,
} from "@/components/features/dashboard/DashboardBlocks";
import { DashboardPanel, DashboardPanelBody, DashboardShortcutTile } from "@/components/features/dashboard/DashboardPanel";
import {
    usePropertiesTotal,
    useRecentNewProperties,
    useRecentValuations,
    useUpcomingAuctions,
} from "@/components/features/dashboard/useDashboardTotals";
import { StatCard } from "@/components/layout/StatCard";
import { dashboardModules, type DashboardModule } from "@/config/modules";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/useAuthStore";

// Short descriptions for modules that have none in the module config.
const fallbackDescriptions: Record<string, string> = {
    users: "Convide pessoas da equipe e gerencie os acessos.",
    roles: "Defina grupos e as permissões de cada um.",
    billing: "Acompanhe seu plano e sua assinatura.",
    "site-settings": "Personalize o site público da imobiliária.",
};

const SHORTCUT_ICONS: Record<string, LucideIcon> = {
    properties: Building2,
    valuations: Calculator,
    "ai-searcher": Bot,
    "market-analytics": BarChart3,
    "valuation-analytics": ClipboardList,
    users: Users,
    roles: ShieldCheck,
    billing: CreditCard,
    "site-settings": Globe,
};

// Order of the "Atalhos" list: day-to-day work first, then analyses, then management.
const SHORTCUT_ORDER = [
    "properties",
    "valuations",
    "ai-searcher",
    "market-analytics",
    "valuation-analytics",
    "users",
    "roles",
    "billing",
    "site-settings",
];

const modulesById = new Map(dashboardModules.map((module) => [module.id, module]));

function descriptionOf(module: DashboardModule): string | undefined {
    return module.dashboard?.description ?? fallbackDescriptions[module.id];
}

/** Count for a KPI; "—" when the request failed. */
function countLabel(value: number | undefined, isError: boolean): string {
    if (isError || value === undefined) return "—";
    return value.toLocaleString("pt-BR");
}

function todayLabel(): string {
    const label = new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    }).format(new Date());
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function StatSkeleton() {
    return (
        <div aria-hidden="true" className="h-[8.5rem] animate-pulse rounded-2xl bg-card">
            <div className="space-y-4 p-6">
                <span className="block h-4 w-28 rounded bg-muted" />
                <span className="block h-9 w-36 rounded bg-muted" />
            </div>
        </div>
    );
}

interface Shortcut {
    key: string;
    href: string;
    icon: LucideIcon;
    title: string;
    description?: string;
}

export function DashboardContent() {
    const user = useAuthStore((state) => state.user);
    const userPermissions = Array.isArray(user?.permissions) ? user.permissions : null;
    const firstName = user?.name?.trim().split(/\s+/)[0] ?? "";

    const canSee = (module: DashboardModule) => {
        if (module.agencyOnly && user?.is_platform_admin === true) return false;
        if (module.platformOnly && user?.is_platform_admin !== true) return false;
        if (module.permissions.length === 0) return true;
        if (userPermissions === null) return false;
        return hasPermission(userPermissions, module.permissions, "any");
    };

    const visible = (id: string): DashboardModule | null => {
        const found = modulesById.get(id);
        return found && canSee(found) ? found : null;
    };

    const properties = visible("properties");
    const newProperties = visible("new-properties");
    const auctions = visible("auctions");
    const valuations = visible("valuations");

    const canViewValuations = valuations !== null && hasPermission(userPermissions, "valuations.view");

    const propertiesTotal = usePropertiesTotal(properties !== null);
    const newData = useRecentNewProperties(newProperties !== null);
    const valuationsData = useRecentValuations(canViewValuations);
    const auctionsData = useUpcomingAuctions(auctions !== null && user !== null);

    const shortcuts: Shortcut[] = [];
    for (const id of SHORTCUT_ORDER) {
        const entry = visible(id);
        if (!entry) continue;
        shortcuts.push({
            key: entry.id,
            href: entry.href,
            icon: SHORTCUT_ICONS[entry.id] ?? entry.icon,
            title: entry.id === "properties" ? "Gerenciar imóveis" : entry.title,
            description: descriptionOf(entry),
        });
        if (entry.id === "properties") {
            shortcuts.push({
                key: "properties-create",
                href: "/properties/create",
                icon: Plus,
                title: "Cadastrar imóvel",
                description: "Preencha as etapas e publique um novo imóvel.",
            });
        }
    }

    const platformLinks: PlatformLink[] = ["platform-agencies", "crawler-operations"]
        .map(visible)
        .filter((module): module is DashboardModule => module !== null)
        .map((module) => ({
            href: module.href,
            icon: module.id === "crawler-operations" ? Radar : Landmark,
            title: module.title,
            description:
                descriptionOf(module) ??
                (module.id === "crawler-operations"
                    ? "Prospecção, fila, execuções e qualidade da coleta."
                    : "Imobiliárias clientes, planos e acessos."),
        }));

    // A lone KPI only repeats its own block below, so the row needs at least two.
    const statCount = [properties, newProperties, auctions].filter(Boolean).length + (canViewValuations ? 1 : 0);
    const hasStats = statCount >= 2;

    // Rows of equal-height cards, as on the reference home: every card of a
    // row shares its top and bottom edges. The wide slot holds the agency's
    // new listings, or the platform areas for a Platform Admin.
    const wideBlock = newProperties ? (
        <NewPropertiesBlock className="h-full" href={newProperties.href} />
    ) : platformLinks.length > 0 ? (
        <PlatformBlock className="h-full" links={platformLinks} />
    ) : null;
    const narrowBlock = auctions ? <AuctionsBlock className="h-full" href={auctions.href} /> : null;
    const fullWidthBlocks = [
        canViewValuations && <ValuationsBlock href="/avaliacoes" key="valuations" />,
        newProperties && platformLinks.length > 0 && <PlatformBlock key="platform" links={platformLinks} />,
    ].filter(Boolean);

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em] text-foreground">
                    {firstName ? `Olá, ${firstName}` : "Olá!"}
                </h1>
                <p className="text-sm leading-4 font-semibold text-subtle" suppressHydrationWarning>
                    {todayLabel()} · Veja como está sua operação e continue de onde parou.
                </p>
            </div>

            {hasStats && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {properties &&
                        (propertiesTotal.isPending ? (
                            <StatSkeleton />
                        ) : (
                            <StatCard
                                hint="Cadastrados na sua carteira"
                                href={properties.href}
                                icon={Building2}
                                title="Imóveis"
                                value={countLabel(propertiesTotal.data, propertiesTotal.isError)}
                            />
                        ))}
                    {newProperties &&
                        (newData.isPending ? (
                            <StatSkeleton />
                        ) : (
                            <StatCard
                                hint="Anúncios recém-encontrados"
                                href={newProperties.href}
                                icon={Sparkles}
                                title="Novidades"
                                tone="info"
                                value={countLabel(newData.data?.newCount, newData.isError)}
                            />
                        ))}
                    {canViewValuations &&
                        (valuationsData.isPending ? (
                            <StatSkeleton />
                        ) : (
                            <StatCard
                                hint="Salvas pela imobiliária"
                                href="/avaliacoes"
                                icon={Calculator}
                                title="Avaliações"
                                tone="success"
                                value={countLabel(valuationsData.data?.total, valuationsData.isError)}
                            />
                        ))}
                    {auctions &&
                        (user === null || auctionsData.isPending ? (
                            <StatSkeleton />
                        ) : (
                            <StatCard
                                hint="Monitorados na região"
                                href={auctions.href}
                                icon={Gavel}
                                title="Leilões"
                                tone="warning"
                                value={countLabel(auctionsData.data?.total, auctionsData.isError)}
                            />
                        ))}
                </div>
            )}

            {shortcuts.length > 0 && (
                <DashboardPanel description="Vá direto para o que você usa." icon={Zap} title="Atalhos">
                    <DashboardPanelBody>
                        <ul aria-label="Atalhos" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {shortcuts.map((shortcut) => (
                                <li className="min-w-0" key={shortcut.key}>
                                    <DashboardShortcutTile
                                        description={shortcut.description}
                                        href={shortcut.href}
                                        icon={shortcut.icon}
                                        title={shortcut.title}
                                    />
                                </li>
                            ))}
                        </ul>
                    </DashboardPanelBody>
                </DashboardPanel>
            )}

            {wideBlock && narrowBlock ? (
                <div className="grid items-stretch gap-6 xl:grid-cols-3">
                    <div className="min-w-0 xl:col-span-2">{wideBlock}</div>
                    <div className="min-w-0">{narrowBlock}</div>
                </div>
            ) : (
                wideBlock ?? narrowBlock
            )}

            {fullWidthBlocks}
        </div>
    );
}
