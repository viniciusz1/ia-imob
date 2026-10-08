"use client";

import { ArrowRight, CircleCheck, CirclePause, Landmark, Radar, Sparkles } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePermission } from "@/hooks/usePermission";
import type { AgencySummary } from "@/services/adminApi";

interface PlatformOverviewClientProps {
    agencies: AgencySummary[];
}

const RECENT_LIMIT = 5;
const NEW_AGENCY_WINDOW_DAYS = 30;

function formatDate(date: string | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR");
}

function createdWithinWindow(agency: AgencySummary): boolean {
    if (!agency.created_at) return false;

    const createdAt = new Date(agency.created_at).getTime();
    if (Number.isNaN(createdAt)) return false;

    const windowStart = Date.now() - NEW_AGENCY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

    return createdAt >= windowStart;
}

function sortByNewest(a: AgencySummary, b: AgencySummary): number {
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
}

export function PlatformOverviewClient({ agencies }: PlatformOverviewClientProps) {
    const canSeeCrawler = usePermission("crawler.view");

    const active = agencies.filter((agency) => agency.is_active);
    const inactive = agencies.filter((agency) => !agency.is_active);
    const recentlyCreated = agencies.filter(createdWithinWindow);
    const recent = [...agencies].sort(sortByNewest).slice(0, RECENT_LIMIT);

    return (
        <div className="space-y-6">
            <PageHeader
                description="Estado das imobiliárias clientes e atalhos para a operação da plataforma."
                title="Visão geral da plataforma"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    hint={agencies.length === 0 ? "Nenhuma agência cadastrada" : "Total cadastrado"}
                    href="/admin/agencies"
                    icon={Landmark}
                    title="Agências"
                    value={agencies.length}
                />
                <StatCard hint="Com CRM e site liberados" icon={CircleCheck} title="Ativas" tone="success" value={active.length} />
                <StatCard hint="Site público fora do ar" icon={CirclePause} title="Desativadas" tone="muted" value={inactive.length} />
                <StatCard
                    hint={`Últimos ${NEW_AGENCY_WINDOW_DAYS} dias`}
                    icon={Sparkles}
                    title="Novas"
                    tone="info"
                    value={recentlyCreated.length}
                />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <Card className="gap-0 overflow-hidden py-0 xl:col-span-2">
                    <SectionHeader
                        description="As últimas imobiliárias cadastradas."
                        href="/admin/agencies"
                        icon={Landmark}
                        linkLabel="Ver todas"
                        title="Agências recentes"
                    />
                    {recent.length === 0 ? (
                        <EmptyState
                            description={
                                <Link className="text-primary hover:underline" href="/admin/agencies/new">
                                    Cadastrar a primeira
                                </Link>
                            }
                            icon={Landmark}
                            title="Nenhuma agência cadastrada ainda."
                            variant="inline"
                        />
                    ) : (
                        <ul className="divide-y">
                            {recent.map((agency) => (
                                <li className="flex items-center gap-3 px-4 py-3 sm:px-5" key={agency.id}>
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            className="block truncate text-sm text-foreground hover:text-primary hover:underline"
                                            href={`/admin/agencies/${agency.id}`}
                                        >
                                            {agency.name}
                                        </Link>
                                        <p className="truncate text-xs text-muted-foreground">{agency.slug}</p>
                                    </div>
                                    <Badge variant={agency.is_active ? "success" : "muted"}>
                                        {agency.is_active ? "Ativa" : "Inativa"}
                                    </Badge>
                                    <span className="hidden w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:block">
                                        {formatDate(agency.created_at)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {canSeeCrawler && (
                    <Card className="gap-0 overflow-hidden py-0">
                        <SectionHeader
                            description="Fontes que alimentam o Buscador com IA."
                            icon={Radar}
                            title="Dados de mercado"
                        />
                        <div className="space-y-4 px-4 py-4 sm:px-5">
                            <p className="text-sm text-muted-foreground">
                                As Crawl Agencies alimentam o Buscador com IA e as avaliações. Elas não são
                                clientes da plataforma.
                            </p>
                            <Button asChild className="w-full" variant="outline">
                                <Link href="/admin/crawler">
                                    <Radar />
                                    Abrir o Crawler
                                    <ArrowRight className="ml-auto" />
                                </Link>
                            </Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
