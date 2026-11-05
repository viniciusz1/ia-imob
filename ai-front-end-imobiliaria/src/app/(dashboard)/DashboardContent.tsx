"use client";

import Link from "next/link";
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
    TrendingDown,
    Users,
} from "lucide-react";

import {
    DashboardFigure,
    DashboardLinkRow,
    DashboardPanel,
} from "@/components/features/dashboard/DashboardPanel";
import {
    useAuctionsTotal,
    useNewPropertiesTotals,
    usePropertiesTotal,
    useValuationsTotal,
} from "@/components/features/dashboard/useDashboardTotals";
import { StatCard } from "@/components/layout/StatCard";
import { Button } from "@/components/ui/button";
import { ChartLegendList, DonutChart, type ChartSegment } from "@/components/ui/charts";
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

const modulesById = new Map(dashboardModules.map((module) => [module.id, module]));

function descriptionOf(module: DashboardModule): string | undefined {
    return module.dashboard?.description ?? fallbackDescriptions[module.id];
}

/** Count for a KPI: "…" never shows; "—" when the request failed. */
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

/** Legend entry with the color dot of its chart segment. */
function LegendLabel({ className, children }: { className: string; children: string }) {
    return (
        <>
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${className}`} />
            {children}
        </>
    );
}

function StatSkeleton() {
    return (
        <div aria-hidden="true" className="h-[7.75rem] animate-pulse rounded-2xl bg-card">
            <div className="space-y-4 p-6">
                <span className="block h-4 w-28 rounded bg-muted" />
                <span className="block h-9 w-36 rounded bg-muted" />
            </div>
        </div>
    );
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
    const aiSearcher = visible("ai-searcher");
    const valuations = visible("valuations");
    const marketAnalytics = visible("market-analytics");
    const valuationAnalytics = visible("valuation-analytics");
    const management = ["users", "roles", "billing", "site-settings"]
        .map(visible)
        .filter((module): module is DashboardModule => module !== null);
    const platform = ["platform-agencies", "crawler-operations"]
        .map(visible)
        .filter((module): module is DashboardModule => module !== null);

    const canViewValuations = valuations !== null && hasPermission(userPermissions, "valuations.view");
    const canCreateValuations = valuations !== null && hasPermission(userPermissions, "valuations.create");

    const propertiesTotal = usePropertiesTotal(properties !== null);
    const newTotals = useNewPropertiesTotals(newProperties !== null);
    const auctionsTotal = useAuctionsTotal(auctions !== null && user !== null);
    const valuationsTotal = useValuationsTotal(canViewValuations);

    const newSegments: ChartSegment[] = [
        {
            key: "new",
            label: <LegendLabel className="bg-info">Novidades</LegendLabel>,
            tone: "info",
            value: newTotals.data?.newCount ?? 0,
        },
        {
            key: "opportunities",
            label: <LegendLabel className="bg-success">Oportunidades</LegendLabel>,
            tone: "success",
            value: newTotals.data?.opportunities ?? 0,
        },
    ];

    const quickActions = [
        properties && { href: "/properties/create", label: "Cadastrar imóvel", icon: Plus },
        canCreateValuations && { href: "/avaliacoes", label: "Avaliar imóvel", icon: Calculator },
        aiSearcher && { href: aiSearcher.href, label: "Buscar com IA", icon: Bot },
    ].filter((action): action is { href: string; label: string; icon: typeof Plus } => Boolean(action));

    const hasStats = properties !== null || newProperties !== null || auctions !== null || canViewValuations;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-1.5">
                    <h1 className="text-2xl leading-8 font-semibold tracking-[-0.01em] text-foreground">
                        {firstName ? `Olá, ${firstName}` : "Olá!"}
                    </h1>
                    <p className="text-sm leading-4 font-semibold text-subtle" suppressHydrationWarning>
                        {todayLabel()} · Veja como está sua operação e continue de onde parou.
                    </p>
                </div>
                {quickActions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {quickActions.map((action, index) => (
                            <Button asChild key={action.href + action.label} variant={index === 0 ? "default" : "outline"}>
                                <Link href={action.href}>
                                    <action.icon />
                                    {action.label}
                                </Link>
                            </Button>
                        ))}
                    </div>
                )}
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
                        (newTotals.isPending ? (
                            <StatSkeleton />
                        ) : (
                            <StatCard
                                hint="Anúncios recém-encontrados"
                                href={newProperties.href}
                                icon={Sparkles}
                                title="Novidades"
                                tone="info"
                                value={countLabel(newTotals.data?.newCount, newTotals.isError)}
                            />
                        ))}
                    {canViewValuations &&
                        (valuationsTotal.isPending ? (
                            <StatSkeleton />
                        ) : (
                            <StatCard
                                hint="Salvas pela imobiliária"
                                href="/avaliacoes"
                                icon={Calculator}
                                title="Avaliações"
                                tone="success"
                                value={countLabel(valuationsTotal.data, valuationsTotal.isError)}
                            />
                        ))}
                    {auctions &&
                        (user === null || auctionsTotal.isPending ? (
                            <StatSkeleton />
                        ) : (
                            <StatCard
                                hint="Monitorados na região"
                                href={auctions.href}
                                icon={Gavel}
                                title="Leilões"
                                tone="warning"
                                value={countLabel(auctionsTotal.data, auctionsTotal.isError)}
                            />
                        ))}
                </div>
            )}

            <div className="grid items-stretch gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                {platform.length > 0 && (
                    <DashboardPanel
                        description="Imobiliárias clientes e fontes de dados de mercado."
                        icon={Landmark}
                        title="Plataforma"
                    >
                        {platform.map((module) => (
                            <DashboardLinkRow
                                description={descriptionOf(module)}
                                href={module.href}
                                icon={module.id === "crawler-operations" ? Radar : Landmark}
                                key={module.id}
                                title={module.title}
                                tone="primary"
                            />
                        ))}
                    </DashboardPanel>
                )}
                {properties && (
                    <DashboardPanel
                        action={{ href: properties.href, label: "Ver carteira" }}
                        description="Sua carteira e os atalhos do dia a dia."
                        href={properties.href}
                        icon={Building2}
                        linkLabel="Imóveis"
                        title="Imóveis"
                    >
                        <DashboardLinkRow
                            description={descriptionOf(properties)}
                            href={properties.href}
                            icon={Building2}
                            label="Gerenciar imóveis"
                            meta={propertiesTotal.isPending ? undefined : countLabel(propertiesTotal.data, propertiesTotal.isError)}
                            title="Gerenciar imóveis"
                            tone="primary"
                        />
                        <DashboardLinkRow
                            description="Preencha as etapas e publique um novo imóvel."
                            href="/properties/create"
                            icon={Plus}
                            title="Cadastrar imóvel"
                        />
                        {aiSearcher && (
                            <DashboardLinkRow
                                description={descriptionOf(aiSearcher)}
                                href={aiSearcher.href}
                                icon={Bot}
                                title="Buscar com IA"
                            />
                        )}
                    </DashboardPanel>
                )}

                {newProperties && (
                    <DashboardPanel
                        action={{ href: newProperties.href, label: "Ver todos" }}
                        description="Anúncios recentes e oportunidades do mercado."
                        href={newProperties.href}
                        icon={Sparkles}
                        linkLabel="Novos imóveis"
                        title="Novos imóveis"
                    >
                        {newTotals.isPending ? (
                            <div className="flex items-center gap-6">
                                <span className="size-[120px] shrink-0 animate-pulse rounded-full bg-muted" />
                                <span className="h-24 flex-1 animate-pulse rounded-xl bg-muted" />
                            </div>
                        ) : (
                            <div className="flex items-center gap-6">
                                <DonutChart label="Novidades e oportunidades" segments={newSegments} size={120} />
                                <ChartLegendList segments={newSegments} />
                            </div>
                        )}
                        <DashboardLinkRow
                            description="Imóveis com preço abaixo do mercado."
                            href={`${newProperties.href}`}
                            icon={TrendingDown}
                            meta={newTotals.isPending ? undefined : countLabel(newTotals.data?.opportunities, newTotals.isError)}
                            title="Ver oportunidades"
                        />
                    </DashboardPanel>
                )}

                {(valuations || valuationAnalytics) && (
                    <DashboardPanel
                        description="Valores de mercado a partir de imóveis comparáveis."
                        href={valuations?.href ?? valuationAnalytics?.href}
                        icon={Calculator}
                        linkLabel="Avaliações"
                        title="Avaliações"
                    >
                        {canViewValuations && (
                            <DashboardFigure
                                caption="Avaliações salvas"
                                loading={valuationsTotal.isPending}
                                value={countLabel(valuationsTotal.data, valuationsTotal.isError)}
                            />
                        )}
                        {valuations && (
                            <DashboardLinkRow
                                description={descriptionOf(valuations)}
                                href={valuations.href}
                                icon={Calculator}
                                title="Avaliar imóvel"
                                tone="primary"
                            />
                        )}
                        {valuationAnalytics && (
                            <DashboardLinkRow
                                description={descriptionOf(valuationAnalytics)}
                                href={valuationAnalytics.href}
                                icon={ClipboardList}
                                title={valuationAnalytics.title}
                            />
                        )}
                    </DashboardPanel>
                )}

                {auctions && (
                    <DashboardPanel
                        description="Judiciais, extrajudiciais e CAIXA na região."
                        href={auctions.href}
                        icon={Gavel}
                        linkLabel="Leilões"
                        title="Leilões"
                    >
                        <DashboardFigure
                            caption="Leilões monitorados"
                            loading={user !== null && auctionsTotal.isPending}
                            value={countLabel(auctionsTotal.data, auctionsTotal.isError)}
                        />
                        <DashboardLinkRow
                            description={descriptionOf(auctions)}
                            href={auctions.href}
                            icon={Gavel}
                            label={auctions.dashboard?.title ?? auctions.title}
                            title="Ver leilões"
                            tone="primary"
                        />
                    </DashboardPanel>
                )}

                {marketAnalytics && (
                    <DashboardPanel
                        description="Estoque, preços e rankings do mercado coletado."
                        href={marketAnalytics.href}
                        icon={BarChart3}
                        linkLabel="Análises"
                        title="Análises"
                    >
                        <DashboardLinkRow
                            description={descriptionOf(marketAnalytics)}
                            href={marketAnalytics.href}
                            icon={BarChart3}
                            title={marketAnalytics.title}
                            tone="primary"
                        />
                        {aiSearcher && (
                            <DashboardLinkRow
                                description="Descreva o imóvel e a IA monta a busca na base."
                                href={aiSearcher.href}
                                icon={Bot}
                                label="Buscador com IA na base de mercado"
                                title="Pesquisar a base de mercado"
                            />
                        )}
                    </DashboardPanel>
                )}

                {management.length > 0 && (
                    <DashboardPanel
                        description="Equipe, permissões, plano e site."
                        icon={ShieldCheck}
                        title="Gestão"
                    >
                        {management.map((module) => (
                            <DashboardLinkRow
                                description={descriptionOf(module)}
                                href={module.href}
                                icon={MANAGEMENT_ICONS[module.id] ?? module.icon}
                                key={module.id}
                                title={module.title}
                            />
                        ))}
                    </DashboardPanel>
                )}

            </div>
        </div>
    );
}

const MANAGEMENT_ICONS: Record<string, typeof Users> = {
    users: Users,
    roles: ShieldCheck,
    billing: CreditCard,
    "site-settings": Globe,
};
