"use client";

import {
    Building2,
    CalendarDays,
    CircleAlert,
    ClipboardX,
    Gavel,
    Home,
    MapPin,
    Sparkles,
    TrendingDown,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
    DashboardList,
    DashboardListMessage,
    DashboardListSkeleton,
    DashboardPanel,
    DashboardPanelBody,
} from "@/components/features/dashboard/DashboardPanel";
import {
    RECENT_NEW_PROPERTIES,
    RECENT_VALUATIONS,
    UPCOMING_AUCTIONS,
    useRecentNewProperties,
    useRecentValuations,
    useUpcomingAuctions,
} from "@/components/features/dashboard/useDashboardTotals";
import { Badge } from "@/components/ui/badge";
import { ChartLegendList, DonutChart, type ChartSegment } from "@/components/ui/charts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { NewPropertyItem } from "@/types/newProperties";
import type { Valuation } from "@/types/valuation";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function formatDate(value: string | null | undefined): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : shortDate.format(date);
}

/** Legend entry with the color dot of its chart segment. */
function LegendLabel({ className, children }: { className: string; children: string }) {
    return (
        <>
            <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", className)} />
            {children}
        </>
    );
}

/* ------------------------------- Novos imóveis ------------------------------ */

function NewPropertyRow({ property, agency }: { property: NewPropertyItem; agency: string }) {
    const title = property.title?.trim() || `${property.tipo} em ${property.bairro}`;
    const hasLink = /^https?:\/\//i.test(property.link_imovel);
    const content: ReactNode = (
        <>
            {property.image ? (
                <span
                    aria-hidden="true"
                    className="size-14 shrink-0 rounded-lg bg-muted bg-cover bg-center"
                    style={{ backgroundImage: `url("${property.image}")` }}
                />
            ) : (
                <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Home className="size-5" />
                </span>
            )}
            <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{title}</span>
                    {property.is_opportunity && (
                        <Badge className="shrink-0" variant="success">
                            Oportunidade
                        </Badge>
                    )}
                </span>
                <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[0.8125rem] text-subtle">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    <span className="truncate">
                        {property.bairro} — {property.cidade} · {agency}
                    </span>
                </span>
            </span>
            <span className="shrink-0 text-right text-sm font-semibold text-foreground tabular-nums">
                {property.preco > 0 ? currency.format(property.preco) : "Sob consulta"}
            </span>
        </>
    );

    const rowClass = "flex items-center gap-3 px-6 py-3 sm:px-8";

    return (
        <li>
            {hasLink ? (
                <a
                    className={cn(rowClass, "transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none")}
                    href={property.link_imovel}
                    rel="noreferrer"
                    target="_blank"
                >
                    {content}
                </a>
            ) : (
                <div className={rowClass}>{content}</div>
            )}
        </li>
    );
}

export function NewPropertiesBlock({ href, className }: { href: string; className?: string }) {
    const query = useRecentNewProperties(true);

    const segments: ChartSegment[] = [
        {
            key: "new",
            label: <LegendLabel className="bg-info">Novidades</LegendLabel>,
            tone: "info",
            value: query.data?.newCount ?? 0,
        },
        {
            key: "opportunities",
            label: <LegendLabel className="bg-success">Oportunidades</LegendLabel>,
            tone: "success",
            value: query.data?.opportunities ?? 0,
        },
    ];

    return (
        <DashboardPanel
            action={{ href, label: "Ver todos" }}
            className={className}
            description="Anúncios recém-encontrados e oportunidades abaixo do preço de mercado."
            href={href}
            icon={Sparkles}
            title="Novos imóveis"
        >
            <div className="grid border-t lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                <div className="flex items-center gap-5 px-6 py-5 sm:px-8 lg:flex-col lg:items-stretch lg:justify-center lg:border-r">
                    {query.isPending ? (
                        <span aria-hidden="true" className="mx-auto size-[7.5rem] shrink-0 animate-pulse rounded-full bg-muted" />
                    ) : (
                        <span className="flex shrink-0 justify-center">
                            <DonutChart label="Novidades e oportunidades" segments={segments} size={120} />
                        </span>
                    )}
                    <ChartLegendList className="min-w-0 flex-1 lg:flex-none" segments={segments} />
                </div>

                <div className="min-w-0 border-t lg:border-t-0">
                    {query.isPending ? (
                        <DashboardListSkeleton rows={RECENT_NEW_PROPERTIES} withThumb />
                    ) : query.isError ? (
                        <DashboardListMessage icon={CircleAlert}>Não foi possível carregar os anúncios.</DashboardListMessage>
                    ) : query.data.items.length === 0 ? (
                        <DashboardListMessage icon={Sparkles}>Nenhum anúncio novo por enquanto.</DashboardListMessage>
                    ) : (
                        <ul aria-label="Anúncios mais recentes" className="divide-y [&>li:first-child]:border-t-0">
                            {query.data.items.map(({ property, agency }) => (
                                <NewPropertyRow agency={agency} key={property.id} property={property} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </DashboardPanel>
    );
}

/* ---------------------------- Últimas avaliações ---------------------------- */

function valuationTone(status: Valuation["status"]): "success" | "warning" | "muted" {
    if (status === "calculated") return "success";
    if (status === "insufficient_sample") return "warning";
    return "muted";
}

export function ValuationsBlock({ href, className }: { href: string; className?: string }) {
    const query = useRecentValuations(true);

    return (
        <DashboardPanel
            action={{ href, label: "Ver histórico" }}
            className={className}
            description="As avaliações salvas mais recentes da imobiliária."
            href={href}
            icon={TrendingDown}
            title="Últimas avaliações"
        >
            {query.isPending ? (
                <DashboardListSkeleton rows={RECENT_VALUATIONS} />
            ) : query.isError ? (
                <DashboardListMessage icon={CircleAlert}>Não foi possível carregar as avaliações.</DashboardListMessage>
            ) : query.data.items.length === 0 ? (
                <DashboardListMessage icon={ClipboardX}>Nenhuma avaliação salva ainda.</DashboardListMessage>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Avaliação</TableHead>
                            <TableHead>Imóvel</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Valor central</TableHead>
                            <TableHead className="text-right">Data</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {query.data.items.map((valuation) => (
                            <TableRow key={valuation.id}>
                                <TableCell>
                                    <Link
                                        className="font-medium text-foreground tabular-nums hover:text-primary focus-visible:outline-none focus-visible:underline"
                                        href={href}
                                    >
                                        {valuation.code}
                                    </Link>
                                    <p className="mt-0.5 text-[0.8125rem] text-subtle">
                                        {valuation.subject_property.neighborhood}, {valuation.subject_property.city}
                                    </p>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                    {valuation.subject_property.residential_type_label} ·{" "}
                                    {valuation.subject_property.area.toLocaleString("pt-BR")} m²
                                </TableCell>
                                <TableCell>
                                    <Badge variant={valuationTone(valuation.status)}>{valuation.status_label}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-medium text-foreground tabular-nums">
                                    {valuation.final_range?.display.central ?? "—"}
                                </TableCell>
                                <TableCell className="text-right text-muted-foreground tabular-nums">
                                    {formatDate(valuation.created_at)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </DashboardPanel>
    );
}

/* ------------------------------ Próximos leilões ----------------------------- */

export function AuctionsBlock({ href, className }: { href: string; className?: string }) {
    const query = useUpcomingAuctions(true);

    return (
        <DashboardPanel
            action={{ href, label: "Ver leilões" }}
            className={className}
            description="Judiciais, extrajudiciais e CAIXA."
            href={href}
            icon={Gavel}
            title="Próximos leilões"
        >
            {query.isPending ? (
                <DashboardListSkeleton rows={3} />
            ) : query.isError ? (
                <DashboardListMessage icon={CircleAlert}>Não foi possível carregar os leilões.</DashboardListMessage>
            ) : query.data.items.length === 0 ? (
                <DashboardListMessage icon={Gavel}>Nenhum leilão monitorado no momento.</DashboardListMessage>
            ) : (
                <DashboardList label="Próximos leilões">
                    {query.data.items.slice(0, UPCOMING_AUCTIONS).map((auction) => {
                        const location = [auction.city, auction.state].filter(Boolean).join("/") || "Local não informado";
                        // The API serialises decimals as text ("50000.00"), like on the Leilões page.
                        const bid = Number(auction.round?.minimum_bid ?? Number.NaN);
                        return (
                            <li key={auction.id}>
                                <Link
                                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none sm:px-8"
                                    href={href}
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="line-clamp-1 text-sm font-semibold text-foreground">{auction.title}</span>
                                        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8125rem] text-subtle">
                                            <span className="flex items-center gap-1.5">
                                                <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                                                {location}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <CalendarDays aria-hidden="true" className="size-3.5 shrink-0" />
                                                {formatDate(auction.round?.starts_at)}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="shrink-0 text-right">
                                        <span className="block text-xs text-subtle">Lance mínimo</span>
                                        <span className="mt-0.5 block text-sm font-semibold text-primary tabular-nums">
                                            {Number.isFinite(bid) && bid > 0 ? currency.format(bid) : "—"}
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </DashboardList>
            )}
        </DashboardPanel>
    );
}

/* --------------------------------- Plataforma -------------------------------- */

export interface PlatformLink {
    href: string;
    icon: LucideIcon;
    title: string;
    description: string;
}

/** Platform Admin's main block: the areas they operate, as large tiles. */
export function PlatformBlock({ links, className }: { links: PlatformLink[]; className?: string }) {
    return (
        <DashboardPanel
            className={className}
            description="Imobiliárias clientes e a coleta de dados de mercado."
            icon={Building2}
            title="Plataforma"
        >
            <DashboardPanelBody>
                <div className="grid gap-4 sm:grid-cols-2">
                    {links.map((link) => (
                        <Link
                            className="group/tile flex items-start gap-4 rounded-xl bg-muted p-5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                            href={link.href}
                            key={link.href}
                        >
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                                <link.icon aria-hidden="true" className="size-5" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-base font-semibold text-foreground group-hover/tile:text-primary">{link.title}</span>
                                <span className="mt-1 block text-[0.8125rem] leading-5 text-subtle">{link.description}</span>
                            </span>
                        </Link>
                    ))}
                </div>
            </DashboardPanelBody>
        </DashboardPanel>
    );
}
