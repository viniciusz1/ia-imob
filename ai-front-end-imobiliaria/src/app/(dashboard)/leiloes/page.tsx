"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import {
    BadgePercent,
    Building,
    CalendarClock,
    CheckCircle2,
    CircleAlert,
    Clock,
    ExternalLink,
    FileText,
    FilterX,
    Gavel,
    MapPin,
    Search,
    SearchX,
    TrendingDown,
    X,
} from "lucide-react";

import {
    getAuctions,
    type AuctionApiResource,
    type AuctionFiltersParams,
} from "@/services/auctionService";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const CITIES = ["Todas", "Jaraguá do Sul", "Guaramirim", "Schroeder", "Corupá"];
const MODALITIES: { label: string; value: string }[] = [
    { label: "Todas Modalidades", value: "all" },
    { label: "Judicial", value: "judicial" },
    { label: "Extrajudicial", value: "extrajudicial" },
    { label: "Administrativa / CAIXA", value: "administrative" },
    { label: "Venda Direta / Online", value: "direct_sale" },
];

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

const FALLBACK_PHOTO =
    "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

/** Badge label and tone for each sale modality. */
const MODALITY_BADGES: Record<string, { label: string; variant: BadgeVariant; className?: string }> = {
    judicial: { label: "Judicial", variant: "info" },
    extrajudicial: { label: "Extrajudicial", variant: "warning" },
    administrative: { label: "CAIXA", variant: "muted", className: "bg-primary/10 text-primary" },
    direct_sale: { label: "Venda direta", variant: "success" },
};

const OCCUPANCY_LABELS: Record<string, string> = {
    vacant: "Desocupado",
    occupied: "Ocupado",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** The API sends decimals as strings ("50000.00"); compare them as numbers. */
function toAmount(value: number | string | null | undefined): number {
    const amount = Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number): string {
    return currencyFormatter.format(value);
}

function ModalityBadge({ modality }: { modality: string }) {
    const badge = MODALITY_BADGES[modality.toLowerCase()];

    return (
        <Badge className={badge?.className} variant={badge?.variant ?? "muted"}>
            {badge?.label ?? modality.replace("_", " ")}
        </Badge>
    );
}

function OccupancyBadge({ status }: { status: string }) {
    if (status === "vacant") {
        return (
            <Badge variant="outline">
                <CheckCircle2 className="text-success" />
                Desocupado
            </Badge>
        );
    }

    if (status === "occupied") {
        return (
            <Badge variant="outline">
                <Clock className="text-warning" />
                Ocupado
            </Badge>
        );
    }

    return null;
}

export default function AuctionsPage() {
    const [auctions, setAuctions] = useState<AuctionApiResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCity, setSelectedCity] = useState("Todas");
    const [selectedModality, setSelectedModality] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("created_at");
    const [activeModalItem, setActiveModalItem] = useState<AuctionApiResource | null>(null);

    const fetchAuctions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params: AuctionFiltersParams = {};
            if (searchTerm) params.search = searchTerm;
            if (selectedCity !== "Todas") params.city = selectedCity;
            if (selectedModality !== "all") params.modality = selectedModality;
            if (sortBy === "price_asc") {
                params.sort = "price";
                params.direction = "asc";
            } else if (sortBy === "price_desc") {
                params.sort = "price";
                params.direction = "desc";
            }

            const response = await getAuctions(params);
            setAuctions(response.data);
        } catch (err) {
            console.error("Failed to load auctions", err);
            setError("Não foi possível carregar os leilões no momento.");
        } finally {
            setIsLoading(false);
        }
    }, [searchTerm, selectedCity, selectedModality, sortBy]);

    // Use effect with debounce for search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAuctions();
        }, 500);
        return () => clearTimeout(timer);
    }, [fetchAuctions]);

    const stats = useMemo(() => {
        const total = auctions.length;
        let sumDiscount = 0;
        let minPrice = Infinity;

        for (const a of auctions) {
            const minBid = toAmount(a.round?.minimum_bid);
            const app = toAmount(a.round?.appraisal_value ?? a.round?.minimum_bid);
            if (minBid < minPrice && minBid > 0) minPrice = minBid;
            if (app > minBid) {
                sumDiscount += ((app - minBid) / app) * 100;
            }
        }

        return {
            total,
            avgDiscount: total > 0 ? Math.round(sumDiscount / total) : 0,
            lowestPrice: minPrice === Infinity ? 0 : minPrice,
        };
    }, [auctions]);

    const hasActiveFilters = Boolean(searchTerm) || selectedCity !== "Todas" || selectedModality !== "all";

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedCity("Todas");
        setSelectedModality("all");
    };

    return (
        <div className="space-y-6">
            <PageHeader
                description="Descubra oportunidades em leilões judiciais, extrajudiciais e CAIXA."
                title="Leilões"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard
                    hint="Monitoramento contínuo"
                    icon={Building}
                    title="Oportunidades"
                    tone="primary"
                    value={`${stats.total.toLocaleString("pt-BR")} imóveis`}
                />
                <StatCard
                    hint="Sobre avaliação pericial"
                    icon={BadgePercent}
                    title="Desconto médio"
                    tone="success"
                    value={`~${stats.avgDiscount}% OFF`}
                />
                <StatCard
                    hint="Praças ativas"
                    icon={TrendingDown}
                    title="Lances a partir de"
                    tone="info"
                    value={formatCurrency(stats.lowestPrice)}
                />
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full lg:w-80 lg:shrink-0">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        aria-label="Buscar leilões"
                        className="pr-9 pl-9"
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Busque por título, cidade, bairro..."
                        size="sm"
                        value={searchTerm}
                    />
                    {searchTerm && (
                        <Button
                            aria-label="Limpar busca"
                            className="absolute top-1/2 right-1 -translate-y-1/2"
                            onClick={() => setSearchTerm("")}
                            size="icon-xs"
                            type="button"
                            variant="ghost"
                        >
                            <X />
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <FilterSelect
                        aria-label="Cidade"
                        className="w-full sm:w-48"
                        emptyValue="Todas"
                        onValueChange={setSelectedCity}
                        options={CITIES.map((city) => ({
                            value: city,
                            label: city === "Todas" ? "Todas as cidades" : city,
                        }))}
                        value={selectedCity}
                    />

                    <FilterSelect
                        aria-label="Modalidade"
                        className="w-full sm:w-52"
                        emptyValue="all"
                        onValueChange={setSelectedModality}
                        options={MODALITIES.map((m) => ({ value: m.value, label: m.label }))}
                        value={selectedModality}
                    />

                    <Select value={sortBy} onValueChange={(value: string) => setSortBy(value)}>
                        <SelectTrigger aria-label="Ordenar por" className="w-full sm:w-44" size="sm">
                            <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="created_at">Mais Recentes</SelectItem>
                            <SelectItem value="price_asc">Menor Preço</SelectItem>
                            <SelectItem value="price_desc">Maior Preço</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        className="shrink-0"
                        disabled={!hasActiveFilters}
                        onClick={clearFilters}
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        <FilterX />
                        Limpar filtros
                    </Button>
                </div>

                <p className="shrink-0 text-sm whitespace-nowrap text-muted-foreground tabular-nums lg:ml-auto">
                    <span className="text-foreground">{stats.total}</span> imóveis encontrados
                </p>
            </div>

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <Skeleton className="h-[22rem] rounded-xl" key={index} />
                    ))}
                </div>
            ) : error ? (
                <EmptyState
                    description={error}
                    icon={CircleAlert}
                    title="Erro ao carregar os leilões"
                />
            ) : auctions.length === 0 ? (
                <EmptyState
                    action={
                        hasActiveFilters ? (
                            <Button onClick={clearFilters} type="button" variant="outline">
                                Limpar filtros
                            </Button>
                        ) : undefined
                    }
                    description="Tente alterar os termos de busca ou remover os filtros aplicados."
                    icon={SearchX}
                    title="Nenhum imóvel encontrado"
                />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {auctions.map((item) => {
                        const photoUrl = item.images?.[0] ?? FALLBACK_PHOTO;
                        const appraisal = toAmount(item.round?.appraisal_value ?? item.round?.minimum_bid);
                        const minBid = toAmount(item.round?.minimum_bid);
                        const discountPercent = appraisal > minBid ? Math.round(((appraisal - minBid) / appraisal) * 100) : 0;
                        const location = item.neighborhood ? `${item.neighborhood}, ${item.city}` : item.city;

                        return (
                            <article
                                className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-colors hover:border-primary/30"
                                key={item.id}
                            >
                                <div className="relative h-40 w-full bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos vêm de portais externos */}
                                    <img
                                        alt={item.title || "Imóvel de Leilão"}
                                        className="size-full object-cover"
                                        loading="lazy"
                                        src={photoUrl}
                                    />
                                    {discountPercent > 0 && (
                                        <Badge className="absolute top-2 right-2 bg-success text-success-foreground shadow-sm tabular-nums">
                                            -{discountPercent}%
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-1 flex-col gap-3 p-3">
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <ModalityBadge modality={item.event.sale_modality} />
                                            <OccupancyBadge status={item.occupancy_status} />
                                        </div>
                                        <h2 className="line-clamp-2 text-sm leading-snug text-foreground" title={item.title}>
                                            {item.title}
                                        </h2>
                                        {location && (
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="size-3.5 shrink-0" />
                                                <span className="truncate">{location}</span>
                                            </p>
                                        )}
                                    </div>

                                    <dl className="space-y-1 text-xs">
                                        {item.built_area_m2 && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-muted-foreground">Área construída</dt>
                                                <dd className="text-foreground tabular-nums">{item.built_area_m2} m²</dd>
                                            </div>
                                        )}
                                        {item.land_area_m2 && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-muted-foreground">Área total</dt>
                                                <dd className="text-foreground tabular-nums">{item.land_area_m2} m²</dd>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-muted-foreground">Praça</dt>
                                            <dd className="text-foreground tabular-nums">
                                                {item.round?.starts_at
                                                    ? new Date(item.round.starts_at).toLocaleDateString("pt-BR")
                                                    : "A definir"}
                                            </dd>
                                        </div>
                                    </dl>

                                    <div className="mt-auto rounded-lg bg-muted/50 px-3 py-2">
                                        <p className="text-xs tracking-wide text-muted-foreground uppercase">Lance mínimo</p>
                                        <p className="mt-0.5 text-lg leading-tight tracking-tight text-foreground tabular-nums">
                                            {formatCurrency(minBid)}
                                        </p>
                                        {appraisal > minBid && (
                                            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs tabular-nums">
                                                <span className="text-muted-foreground line-through">
                                                    {formatCurrency(appraisal)}
                                                </span>
                                                <span className="text-success">{discountPercent}% abaixo da avaliação</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 border-t p-3">
                                    <Button className="flex-1" onClick={() => setActiveModalItem(item)} size="xs" type="button">
                                        Ver detalhes
                                    </Button>
                                    {item.canonical_url && (
                                        <Button asChild size="icon-sm" variant="outline">
                                            <a
                                                aria-label="Ver no portal oficial"
                                                href={item.canonical_url}
                                                rel="noopener noreferrer"
                                                target="_blank"
                                                title="Ver no Portal Oficial"
                                            >
                                                <ExternalLink />
                                            </a>
                                        </Button>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <Dialog open={!!activeModalItem} onOpenChange={(open) => !open && setActiveModalItem(null)}>
                <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
                    {activeModalItem && (
                        <AuctionDetail item={activeModalItem} />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AuctionDetail({ item }: { item: AuctionApiResource }) {
    const round = item.round;
    const minBid = toAmount(round?.minimum_bid);
    const appraisal = round?.appraisal_value != null ? toAmount(round.appraisal_value) : null;
    const discountPercent =
        appraisal !== null && appraisal > minBid ? Math.round(((appraisal - minBid) / appraisal) * 100) : 0;
    const address = [item.address, item.neighborhood, item.city].filter(Boolean).join(", ");
    const fullAddress = item.state ? `${address} - ${item.state}` : address;

    return (
        <>
            <DialogHeader className="gap-2 border-b px-6 py-5 text-left">
                <div className="flex flex-wrap items-center gap-2 pr-8">
                    <ModalityBadge modality={item.event.sale_modality} />
                    <OccupancyBadge status={item.occupancy_status} />
                </div>
                <DialogTitle>{item.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" />
                    {fullAddress || "Endereço não informado"}
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 px-6 py-5">
                <div className="aspect-[16/7] overflow-hidden rounded-lg bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos vêm de portais externos */}
                    <img
                        alt={item.title || "Imóvel"}
                        className="size-full object-cover"
                        src={item.images?.[0] ?? FALLBACK_PHOTO}
                    />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm text-foreground">
                            <Gavel className="size-4 text-muted-foreground" />
                            Detalhes do leilão
                        </h3>
                        {round ? (
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                                <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="text-primary">{round.round_number}ª Praça</span>
                                    <span className="flex items-center gap-1 text-muted-foreground tabular-nums">
                                        <CalendarClock className="size-3.5" />
                                        {round.starts_at ? new Date(round.starts_at).toLocaleString("pt-BR") : "A definir"}
                                    </span>
                                </div>
                                <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">Lance mínimo</p>
                                <p className="mt-1 text-3xl tracking-tight text-foreground tabular-nums">
                                    {formatCurrency(minBid)}
                                </p>
                                {appraisal !== null && appraisal > minBid && (
                                    <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs tabular-nums">
                                        <span className="text-muted-foreground">Avaliação: {formatCurrency(appraisal)}</span>
                                        <span className="text-success">{discountPercent}% de desconto</span>
                                    </p>
                                )}
                            </div>
                        ) : (
                            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
                                Nenhuma praça informada.
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <h3 className="flex items-center gap-2 text-sm text-foreground">
                            <Building className="size-4 text-muted-foreground" />
                            Informações adicionais
                        </h3>
                        <dl className="divide-y rounded-lg border text-sm">
                            <div className="flex justify-between gap-4 px-4 py-2.5">
                                <dt className="text-muted-foreground">Leiloeiro</dt>
                                <dd className="text-right text-foreground">{item.event.auctioneer_name || "N/D"}</dd>
                            </div>
                            <div className="flex justify-between gap-4 px-4 py-2.5">
                                <dt className="text-muted-foreground">Ocupação</dt>
                                <dd className="text-right text-foreground">
                                    {OCCUPANCY_LABELS[item.occupancy_status] ?? item.occupancy_status}
                                </dd>
                            </div>
                            {item.lot_number && (
                                <div className="flex justify-between gap-4 px-4 py-2.5">
                                    <dt className="text-muted-foreground">Lote</dt>
                                    <dd className="text-right text-foreground tabular-nums">{item.lot_number}</dd>
                                </div>
                            )}
                        </dl>
                    </div>
                </div>

                {item.description && (
                    <div className="space-y-2">
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">Descrição / Laudo</p>
                        <div className="max-h-40 overflow-y-auto rounded-lg border p-4 text-sm text-muted-foreground">
                            {item.description}
                        </div>
                    </div>
                )}
            </div>

            {(item.notice_url || item.canonical_url) && (
                <DialogFooter className="gap-2 border-t px-6 py-4">
                    {item.notice_url && (
                        <Button asChild variant="outline">
                            <a href={item.notice_url} rel="noopener noreferrer" target="_blank">
                                <FileText />
                                Ver edital
                            </a>
                        </Button>
                    )}
                    {item.canonical_url && (
                        <Button asChild>
                            <a href={item.canonical_url} rel="noopener noreferrer" target="_blank">
                                <ExternalLink />
                                Portal oficial
                            </a>
                        </Button>
                    )}
                </DialogFooter>
            )}
        </>
    );
}
