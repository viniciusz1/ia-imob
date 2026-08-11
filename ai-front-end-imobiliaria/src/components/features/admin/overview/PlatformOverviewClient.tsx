"use client";

import { ArrowRight, Radar } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { usePermission } from "@/hooks/usePermission";
import { AdminPageHeader } from "@/components/features/admin/AdminPageHeader";
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

// Mirrors the Crawler overview metric cards: a small label in the header and the
// figure in the content, so both overview screens read as the same system.
function StatCard({ label, value, hint }: { label: string; value: number; hint: string }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
            </CardContent>
        </Card>
    );
}

export function PlatformOverviewClient({ agencies }: PlatformOverviewClientProps) {
    const canSeeCrawler = usePermission("crawler.view");

    const active = agencies.filter((agency) => agency.is_active);
    const inactive = agencies.filter((agency) => !agency.is_active);
    const recentlyCreated = agencies.filter(createdWithinWindow);
    const recent = [...agencies].sort(sortByNewest).slice(0, RECENT_LIMIT);

    return (
        <div className="flex flex-col gap-6">
            <AdminPageHeader
                description="Estado das imobiliárias clientes e atalhos para a operação da plataforma."
                title="Visão geral da plataforma"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    hint={agencies.length === 0 ? "Nenhuma agência cadastrada" : "Total cadastrado"}
                    label="Agências"
                    value={agencies.length}
                />
                <StatCard hint="Com CRM e site liberados" label="Ativas" value={active.length} />
                <StatCard hint="Site público fora do ar" label="Desativadas" value={inactive.length} />
                <StatCard
                    hint={`Últimos ${NEW_AGENCY_WINDOW_DAYS} dias`}
                    label="Novas"
                    value={recentlyCreated.length}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                        <div>
                            <CardTitle className="text-base">Agências recentes</CardTitle>
                            <CardDescription>As últimas imobiliárias cadastradas.</CardDescription>
                        </div>
                        <Button asChild size="sm" variant="outline">
                            <Link href="/admin/agencies">
                                Ver todas
                                <ArrowRight className="ml-1 size-4" />
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {recent.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Nenhuma agência cadastrada ainda.{" "}
                                <Link className="text-primary hover:underline" href="/admin/agencies/new">
                                    Cadastrar a primeira
                                </Link>
                                .
                            </p>
                        ) : (
                            <ul className="flex flex-col">
                                {recent.map((agency) => (
                                    <li
                                        className="flex items-center gap-3 border-b py-2 text-sm last:border-b-0"
                                        key={agency.id}
                                    >
                                        <Link
                                            className="font-medium text-primary hover:underline"
                                            href={`/admin/agencies/${agency.id}`}
                                        >
                                            {agency.name}
                                        </Link>
                                        <Badge variant={agency.is_active ? "default" : "secondary"}>
                                            {agency.is_active ? "Ativa" : "Inativa"}
                                        </Badge>
                                        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                                            {formatDate(agency.created_at)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>

                {canSeeCrawler && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Dados de mercado</CardTitle>
                            <CardDescription>
                                As Crawl Agencies que alimentam o Buscador com IA e as avaliações. Elas
                                não são clientes da plataforma.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild variant="outline">
                                <Link href="/admin/crawler">
                                    <Radar className="mr-1 size-4" />
                                    Abrir o Crawler
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
