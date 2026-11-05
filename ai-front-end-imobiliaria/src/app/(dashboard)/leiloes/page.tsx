"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import {
    BadgePercent,
    Bell,
    BookmarkCheck,
    Building,
    Calendar,
    CalendarClock,
    Check,
    CheckCircle2,
    CircleAlert,
    Clock,
    DollarSign,
    ExternalLink,
    FileText,
    FilterX,
    Gavel,
    Loader2,
    MapPin,
    Search,
    SearchX,
    SlidersHorizontal,
    Trash2,
    TrendingDown,
    X,
} from "lucide-react";
import { toast } from "sonner";

import {
    deleteAuctionAlert,
    getAuctionAlerts,
    getAuctions,
    saveAuctionAlert,
    type AuctionApiResource,
    type AuctionFiltersParams,
    type AuctionRoundResource,
    type SavedAuctionAlert,
} from "@/services/auctionService";

import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FilterSelect } from "@/components/ui/filter-select";
import { FormField } from "@/components/ui/form-field";
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

const PROPERTY_TYPES: { label: string; value: string }[] = [
    { label: "Todos os Tipos", value: "all" },
    { label: "Casas", value: "house" },
    { label: "Apartamentos", value: "apartment" },
    { label: "Terrenos", value: "land" },
    { label: "Comercial", value: "commercial" },
    { label: "Outros", value: "outro" },
];

const STATUSES: { label: string; value: string }[] = [
    { label: "Todos os Status", value: "all" },
    { label: "Abertos / Em Andamento", value: "open" },
    { label: "Agendados (Futuros)", value: "scheduled" },
    { label: "Encerrados / Expirados", value: "expired" },
];

const BID_PRESETS: { label: string; min?: number; max?: number }[] = [
    { label: "Até R$ 200k", max: 200000 },
    { label: "R$ 200k - R$ 500k", min: 200000, max: 500000 },
    { label: "R$ 500k - R$ 1M", min: 500000, max: 1000000 },
    { label: "> R$ 1M", min: 1000000 },
];

const DATE_PRESETS = [7, 30, 60];

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

/** Badge label and tone for each round/event status. */
const ROUND_STATUS_BADGES: Record<string, { label: string; variant: BadgeVariant }> = {
    open: { label: "Aberto", variant: "success" },
    scheduled: { label: "Agendado", variant: "info" },
    expired: { label: "Finalizado", variant: "destructive" },
    closed: { label: "Finalizado", variant: "destructive" },
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

function formatDate(value: string): string {
    return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function toIsoDate(date: Date): string {
    return date.toISOString().split("T")[0];
}

function ModalityBadge({ modality }: { modality: string }) {
    const badge = MODALITY_BADGES[modality.toLowerCase()];

    return (
        <Badge className={badge?.className} variant={badge?.variant ?? "muted"}>
            {badge?.label ?? modality.replace("_", " ")}
        </Badge>
    );
}

function RoundStatusBadge({ status }: { status: string | null | undefined }) {
    if (!status) return null;
    const badge = ROUND_STATUS_BADGES[status.toLowerCase()];

    return <Badge variant={badge?.variant ?? "outline"}>{badge?.label ?? status}</Badge>;
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

function labelFor(options: { label: string; value: string }[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? value;
}

export default function AuctionsPage() {
    const [auctions, setAuctions] = useState<AuctionApiResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Basic filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCity, setSelectedCity] = useState("Todas");
    const [selectedModality, setSelectedModality] = useState<string>("all");
    const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("created_at");

    // Advanced filters
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [minBid, setMinBid] = useState<string>("");
    const [maxBid, setMaxBid] = useState<string>("");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");

    const [activeModalItem, setActiveModalItem] = useState<AuctionApiResource | null>(null);

    // Alerts
    const [savedAlerts, setSavedAlerts] = useState<SavedAuctionAlert[]>([]);
    const [isCreateAlertOpen, setIsCreateAlertOpen] = useState(false);
    const [isViewAlertsOpen, setIsViewAlertsOpen] = useState(false);
    const [alertName, setAlertName] = useState("");
    const [isSavingAlert, setIsSavingAlert] = useState(false);

    const loadAlerts = useCallback(async () => {
        try {
            setSavedAlerts(await getAuctionAlerts());
        } catch {
            // Alerts are optional; the page works without them.
        }
    }, []);

    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    const buildFilterParams = useCallback((): AuctionFiltersParams => {
        const params: AuctionFiltersParams = {};

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (selectedCity !== "Todas") params.city = selectedCity;
        if (selectedModality !== "all") params.modality = selectedModality;
        if (selectedPropertyType !== "all") params.property_type = selectedPropertyType;
        if (selectedStatus !== "all") params.status = selectedStatus;

        const numericMin = parseFloat(minBid.replace(/\D/g, ""));
        if (!isNaN(numericMin) && numericMin > 0) params.min_bid = numericMin;

        const numericMax = parseFloat(maxBid.replace(/\D/g, ""));
        if (!isNaN(numericMax) && numericMax > 0) params.max_bid = numericMax;

        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;

        if (sortBy === "price_asc") {
            params.sort = "price";
            params.direction = "asc";
        } else if (sortBy === "price_desc") {
            params.sort = "price";
            params.direction = "desc";
        } else if (sortBy === "date_asc") {
            params.sort = "date";
            params.direction = "asc";
        } else if (sortBy === "discount_desc") {
            params.sort = "discount";
            params.direction = "desc";
        }

        return params;
    }, [searchTerm, selectedCity, selectedModality, selectedPropertyType, selectedStatus, minBid, maxBid, dateFrom, dateTo, sortBy]);

    const fetchAuctions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await getAuctions(buildFilterParams());
            setAuctions(response.data);
        } catch (err) {
            console.error("Failed to load auctions", err);
            setError("Não foi possível carregar os leilões no momento.");
        } finally {
            setIsLoading(false);
        }
    }, [buildFilterParams]);

    // Debounced fetch while the user types.
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAuctions();
        }, 400);
        return () => clearTimeout(timer);
    }, [fetchAuctions]);

    const stats = useMemo(() => {
        const total = auctions.length;
        let sumDiscount = 0;
        let minPrice = Infinity;

        for (const a of auctions) {
            const minimum = toAmount(a.round?.minimum_bid);
            const app = toAmount(a.round?.appraisal_value ?? a.round?.minimum_bid);
            if (minimum < minPrice && minimum > 0) minPrice = minimum;
            if (app > minimum) {
                sumDiscount += ((app - minimum) / app) * 100;
            }
        }

        return {
            total,
            avgDiscount: total > 0 ? Math.round(sumDiscount / total) : 0,
            lowestPrice: minPrice === Infinity ? 0 : minPrice,
        };
    }, [auctions]);

    const advancedFilterCount = [minBid, maxBid, dateFrom, dateTo].filter(Boolean).length;

    const hasActiveFilters =
        Boolean(searchTerm.trim()) ||
        selectedCity !== "Todas" ||
        selectedModality !== "all" ||
        selectedPropertyType !== "all" ||
        selectedStatus !== "all" ||
        advancedFilterCount > 0;

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedCity("Todas");
        setSelectedModality("all");
        setSelectedPropertyType("all");
        setSelectedStatus("all");
        setMinBid("");
        setMaxBid("");
        setDateFrom("");
        setDateTo("");
        setSortBy("created_at");
    };

    const openCreateAlert = () => {
        setAlertName(selectedCity !== "Todas" ? `Leilões em ${selectedCity}` : "Novo Alerta de Leilões");
        setIsCreateAlertOpen(true);
    };

    const handleSaveAlert = async () => {
        if (!alertName.trim()) {
            toast.error("Por favor, informe um nome para o alerta.");
            return;
        }

        setIsSavingAlert(true);
        try {
            const newAlert = await saveAuctionAlert(alertName.trim(), buildFilterParams());
            setSavedAlerts((prev) => [newAlert, ...prev]);
            setIsCreateAlertOpen(false);
            setAlertName("");
            toast.success("Alerta de leilão criado com sucesso!");
        } catch {
            toast.error("Erro ao salvar alerta de leilão.");
        } finally {
            setIsSavingAlert(false);
        }
    };

    const handleDeleteAlert = async (id: number) => {
        try {
            await deleteAuctionAlert(id);
            setSavedAlerts((prev) => prev.filter((a) => a.id !== id));
            toast.success("Alerta removido.");
        } catch {
            toast.error("Não foi possível excluir o alerta.");
        }
    };

    const handleApplyAlert = (alert: SavedAuctionAlert) => {
        const f = alert.filters;
        if (f.search !== undefined) setSearchTerm(f.search);
        if (f.city !== undefined) setSelectedCity(f.city);
        if (f.modality !== undefined) setSelectedModality(f.modality);
        if (f.property_type !== undefined) setSelectedPropertyType(f.property_type);
        if (f.status !== undefined) setSelectedStatus(f.status);
        if (f.min_bid !== undefined) setMinBid(String(f.min_bid));
        if (f.max_bid !== undefined) setMaxBid(String(f.max_bid));
        if (f.date_from !== undefined) setDateFrom(f.date_from);
        if (f.date_to !== undefined) setDateTo(f.date_to);

        setIsViewAlertsOpen(false);
        toast.info(`Filtros do alerta "${alert.name}" aplicados.`);
    };

    const setQuickBid = (min?: number, max?: number) => {
        setMinBid(min ? String(min) : "");
        setMaxBid(max ? String(max) : "");
    };

    const setQuickDateDays = (days: number) => {
        const today = new Date();
        const target = new Date();
        target.setDate(today.getDate() + days);

        setDateFrom(toIsoDate(today));
        setDateTo(toIsoDate(target));
    };

    const advancedChips = [
        minBid && { key: "min", label: `Mín: ${formatCurrency(Number(minBid))}`, clear: () => setMinBid("") },
        maxBid && { key: "max", label: `Máx: ${formatCurrency(Number(maxBid))}`, clear: () => setMaxBid("") },
        dateFrom && { key: "from", label: `De: ${formatDate(dateFrom)}`, clear: () => setDateFrom("") },
        dateTo && { key: "to", label: `Até: ${formatDate(dateTo)}`, clear: () => setDateTo("") },
    ].filter((chip): chip is { key: string; label: string; clear: () => void } => Boolean(chip));

    return (
        <div className="space-y-6">
            <PageHeader
                actions={
                    <>
                        <Button onClick={() => setIsViewAlertsOpen(true)} type="button" variant="outline">
                            <Bell />
                            Meus alertas
                            {savedAlerts.length > 0 && (
                                <Badge className="px-1.5 tabular-nums" variant="muted">
                                    {savedAlerts.length}
                                </Badge>
                            )}
                        </Button>
                        <Button onClick={openCreateAlert} type="button">
                            <BookmarkCheck />
                            Criar alerta
                        </Button>
                    </>
                }
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

            <Card className="gap-0 p-0">
                <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
                    <div className="relative min-w-64 flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            aria-label="Buscar leilões"
                            className="pr-10 pl-10"
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Busque por título, cidade, bairro, leiloeiro..."
                            size="sm"
                            value={searchTerm}
                        />
                        {searchTerm && (
                            <Button
                                aria-label="Limpar busca"
                                className="absolute top-1/2 right-1.5 -translate-y-1/2"
                                onClick={() => setSearchTerm("")}
                                size="icon-xs"
                                type="button"
                                variant="ghost"
                            >
                                <X />
                            </Button>
                        )}
                    </div>

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
                        options={MODALITIES}
                        value={selectedModality}
                    />

                    <FilterSelect
                        aria-label="Tipo de imóvel"
                        className="w-full sm:w-44"
                        emptyValue="all"
                        onValueChange={setSelectedPropertyType}
                        options={PROPERTY_TYPES}
                        value={selectedPropertyType}
                    />

                    <FilterSelect
                        aria-label="Status"
                        className="w-full sm:w-52"
                        emptyValue="all"
                        onValueChange={setSelectedStatus}
                        options={STATUSES}
                        value={selectedStatus}
                    />

                    <Select value={sortBy} onValueChange={(value: string) => setSortBy(value)}>
                        <SelectTrigger aria-label="Ordenar por" className="w-full sm:w-52" size="sm">
                            <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="created_at">Mais Recentes</SelectItem>
                            <SelectItem value="price_asc">Menor Lance</SelectItem>
                            <SelectItem value="price_desc">Maior Lance</SelectItem>
                            <SelectItem value="date_asc">Praça Mais Próxima</SelectItem>
                            <SelectItem value="discount_desc">Maior Desconto</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t px-5 py-4 sm:px-6">
                    <Button
                        aria-expanded={isAdvancedOpen}
                        className="shrink-0"
                        onClick={() => setIsAdvancedOpen((prev) => !prev)}
                        type="button"
                        variant={isAdvancedOpen || advancedFilterCount > 0 ? "secondary" : "outline"}
                    >
                        <SlidersHorizontal />
                        Busca avançada
                        {advancedFilterCount > 0 && (
                            <Badge className="px-1.5 tabular-nums">{advancedFilterCount}</Badge>
                        )}
                    </Button>

                    <Button
                        className="shrink-0"
                        disabled={!hasActiveFilters}
                        onClick={clearFilters}
                        type="button"
                        variant="ghost"
                    >
                        <FilterX />
                        Limpar filtros
                    </Button>

                    {advancedChips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-subtle">Busca avançada:</span>
                            {advancedChips.map((chip) => (
                                <Badge className="h-7 gap-1.5 pr-1 tabular-nums" key={chip.key} variant="muted">
                                    {chip.label}
                                    <button
                                        aria-label={`Remover ${chip.label}`}
                                        className="rounded-sm p-0.5 hover:bg-foreground/10"
                                        onClick={chip.clear}
                                        type="button"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    <p className="ml-auto shrink-0 text-sm whitespace-nowrap text-subtle tabular-nums">
                        <span className="font-semibold text-foreground">{stats.total}</span> imóveis encontrados
                    </p>
                </div>

                {isAdvancedOpen && (
                    <div className="border-t">
                        <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-2">
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                    <DollarSign className="size-5 text-sidebar-highlight" />
                                    Faixa de lance mínimo
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField htmlFor="auction-min-bid" label="Lance mínimo">
                                        <Input
                                            id="auction-min-bid"
                                            inputMode="numeric"
                                            onChange={(e) => setMinBid(e.target.value)}
                                            placeholder="Ex: 100000"
                                            type="number"
                                            value={minBid}
                                        />
                                    </FormField>
                                    <FormField htmlFor="auction-max-bid" label="Lance máximo">
                                        <Input
                                            id="auction-max-bid"
                                            inputMode="numeric"
                                            onChange={(e) => setMaxBid(e.target.value)}
                                            placeholder="Ex: 500000"
                                            type="number"
                                            value={maxBid}
                                        />
                                    </FormField>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {BID_PRESETS.map((preset) => (
                                        <Button
                                            key={preset.label}
                                            onClick={() => setQuickBid(preset.min, preset.max)}
                                            size="xs"
                                            type="button"
                                            variant="secondary"
                                        >
                                            {preset.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                                    <Calendar className="size-5 text-sidebar-highlight" />
                                    Data da praça / leilão
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField htmlFor="auction-date-from" label="A partir de">
                                        <DatePicker
                                            id="auction-date-from"
                                            onChange={setDateFrom}
                                            value={dateFrom}
                                        />
                                    </FormField>
                                    <FormField htmlFor="auction-date-to" label="Até a data">
                                        <DatePicker
                                            id="auction-date-to"
                                            onChange={setDateTo}
                                            value={dateTo}
                                        />
                                    </FormField>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {DATE_PRESETS.map((days) => (
                                        <Button
                                            key={days}
                                            onClick={() => setQuickDateDays(days)}
                                            size="xs"
                                            type="button"
                                            variant="secondary"
                                        >
                                            Próximos {days} dias
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t px-5 py-4 sm:px-6">
                            <Button onClick={clearFilters} type="button" variant="ghost">
                                Redefinir filtros
                            </Button>
                            <Button onClick={openCreateAlert} type="button" variant="outline">
                                <Bell />
                                Salvar como alerta
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {isLoading ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {Array.from({ length: 10 }).map((_, index) => (
                        <Skeleton className="h-[30rem] rounded-2xl" key={index} />
                    ))}
                </div>
            ) : error ? (
                <EmptyState
                    action={
                        <Button onClick={fetchAuctions} type="button" variant="outline">
                            Tentar novamente
                        </Button>
                    }
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
                    description="Tente alterar os termos de busca, as faixas de lance ou remover os filtros aplicados."
                    icon={SearchX}
                    title="Nenhum imóvel encontrado"
                />
            ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {auctions.map((item) => {
                        const photoUrl = item.images?.[0] ?? FALLBACK_PHOTO;
                        const appraisal = toAmount(item.round?.appraisal_value ?? item.round?.minimum_bid);
                        const minimum = toAmount(item.round?.minimum_bid);
                        const discountPercent = appraisal > minimum ? Math.round(((appraisal - minimum) / appraisal) * 100) : 0;
                        const location = item.neighborhood ? `${item.neighborhood}, ${item.city}` : item.city;
                        const roundStatus = item.round?.status ?? item.event.status;

                        return (
                            <article
                                className="flex flex-col overflow-hidden rounded-2xl border border-card-edge bg-card shadow-[1px_2px_4px_rgba(0,0,0,0.05)] transition-colors hover:border-primary"
                                key={item.id}
                            >
                                <div className="relative h-48 w-full bg-muted">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- fotos vêm de portais externos */}
                                    <img
                                        alt={item.title || "Imóvel de Leilão"}
                                        className="size-full object-cover"
                                        loading="lazy"
                                        src={photoUrl}
                                    />
                                    {discountPercent > 0 && (
                                        <Badge className="absolute top-3 right-3 h-7 bg-success px-2.5 text-sm text-success-foreground shadow-sm tabular-nums">
                                            -{discountPercent}%
                                        </Badge>
                                    )}
                                </div>

                                <div className="flex flex-1 flex-col gap-4 p-6">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <ModalityBadge modality={item.event.sale_modality} />
                                            <RoundStatusBadge status={roundStatus} />
                                            <OccupancyBadge status={item.occupancy_status} />
                                        </div>
                                        <h2 className="line-clamp-2 text-base leading-6 font-semibold text-foreground" title={item.title}>
                                            {item.title}
                                        </h2>
                                        {location && (
                                            <p className="flex items-center gap-1.5 text-sm text-subtle">
                                                <MapPin className="size-4 shrink-0" />
                                                <span className="truncate">{location}</span>
                                            </p>
                                        )}
                                    </div>

                                    <dl className="space-y-2 text-sm">
                                        {item.built_area_m2 && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-subtle">Área construída</dt>
                                                <dd className="font-medium text-foreground tabular-nums">{item.built_area_m2} m²</dd>
                                            </div>
                                        )}
                                        {item.land_area_m2 && (
                                            <div className="flex justify-between gap-3">
                                                <dt className="text-subtle">Área total</dt>
                                                <dd className="font-medium text-foreground tabular-nums">{item.land_area_m2} m²</dd>
                                            </div>
                                        )}
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-subtle">Praça</dt>
                                            <dd className="font-medium text-foreground tabular-nums">
                                                {item.round?.starts_at
                                                    ? new Date(item.round.starts_at).toLocaleDateString("pt-BR")
                                                    : "A definir"}
                                            </dd>
                                        </div>
                                    </dl>

                                    <div className="mt-auto rounded-xl bg-muted p-4">
                                        <p className="text-xs font-semibold tracking-wide text-subtle uppercase">Lance mínimo</p>
                                        <p className="mt-1 text-2xl leading-8 font-semibold tracking-[-0.01em] text-foreground tabular-nums">
                                            {formatCurrency(minimum)}
                                        </p>
                                        {appraisal > minimum && (
                                            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm tabular-nums">
                                                <span className="text-subtle line-through">
                                                    {formatCurrency(appraisal)}
                                                </span>
                                                <span className="font-medium text-success">{discountPercent}% abaixo da avaliação</span>
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <Button className="flex-1" onClick={() => setActiveModalItem(item)} type="button">
                                            Ver detalhes
                                        </Button>
                                        {item.canonical_url && (
                                            <Button asChild size="icon" variant="outline">
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

            <Dialog open={isCreateAlertOpen} onOpenChange={setIsCreateAlertOpen}>
                <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
                    <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
                        <DialogTitle>Criar alerta de leilão</DialogTitle>
                        <DialogDescription>
                            Salve este conjunto de filtros para monitorar novos imóveis.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 px-6 py-5">
                        <FormField htmlFor="auction-alert-name" label="Nome do alerta" required>
                            <Input
                                autoFocus
                                id="auction-alert-name"
                                onChange={(e) => setAlertName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveAlert();
                                }}
                                placeholder="Ex: Leilões em Jaraguá até R$ 300k"
                                value={alertName}
                            />
                        </FormField>

                        <div className="rounded-xl bg-muted p-4 text-sm">
                            <p className="text-xs font-semibold tracking-wide text-subtle uppercase">Critérios deste alerta</p>
                            <dl className="mt-2 space-y-1">
                                <AlertCriterion label="Cidade" value={selectedCity} />
                                <AlertCriterion label="Modalidade" value={labelFor(MODALITIES, selectedModality)} />
                                <AlertCriterion label="Tipo" value={labelFor(PROPERTY_TYPES, selectedPropertyType)} />
                                <AlertCriterion label="Status" value={labelFor(STATUSES, selectedStatus)} />
                                {minBid && <AlertCriterion label="Lance mínimo" value={formatCurrency(Number(minBid))} />}
                                {maxBid && <AlertCriterion label="Lance máximo" value={formatCurrency(Number(maxBid))} />}
                                {dateFrom && <AlertCriterion label="A partir de" value={formatDate(dateFrom)} />}
                                {dateTo && <AlertCriterion label="Até" value={formatDate(dateTo)} />}
                            </dl>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 border-t px-6 py-4">
                        <Button onClick={() => setIsCreateAlertOpen(false)} type="button" variant="outline">
                            Cancelar
                        </Button>
                        <Button disabled={isSavingAlert || !alertName.trim()} onClick={handleSaveAlert} type="button">
                            {isSavingAlert ? <Loader2 className="animate-spin" /> : <Check />}
                            Salvar alerta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isViewAlertsOpen} onOpenChange={setIsViewAlertsOpen}>
                <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-lg">
                    <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
                        <DialogTitle>Meus alertas de leilões</DialogTitle>
                        <DialogDescription>
                            Filtros salvos para monitoramento contínuo de oportunidades.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-5">
                        {savedAlerts.length === 0 ? (
                            <EmptyState
                                description="Configure os filtros na tela e clique em “Criar alerta”."
                                icon={Bell}
                                title="Nenhum alerta salvo ainda"
                            />
                        ) : (
                            <ul className="space-y-2">
                                {savedAlerts.map((alert) => (
                                    <li className="flex items-center justify-between gap-3 rounded-xl bg-muted px-4 py-3" key={alert.id}>
                                        <div className="min-w-0 space-y-0.5">
                                            <p className="truncate text-sm font-semibold text-foreground">{alert.name}</p>
                                            <p className="truncate text-xs text-subtle">
                                                {[
                                                    alert.filters.city,
                                                    alert.filters.modality && labelFor(MODALITIES, alert.filters.modality),
                                                    alert.filters.max_bid && `Até ${formatCurrency(alert.filters.max_bid)}`,
                                                ]
                                                    .filter(Boolean)
                                                    .join(" · ") || "Todos os leilões"}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <Button onClick={() => handleApplyAlert(alert)} size="sm" type="button" variant="outline">
                                                Aplicar
                                            </Button>
                                            <Button
                                                aria-label={`Excluir alerta ${alert.name}`}
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteAlert(alert.id)}
                                                size="icon-sm"
                                                title="Excluir alerta"
                                                type="button"
                                                variant="ghost"
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <DialogFooter className="gap-2 border-t px-6 py-4">
                        <Button onClick={() => setIsViewAlertsOpen(false)} type="button" variant="outline">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function AlertCriterion({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right text-foreground tabular-nums">{value}</dd>
        </div>
    );
}

function RoundCard({ round }: { round: AuctionRoundResource }) {
    const minimum = toAmount(round.minimum_bid);
    const appraisal = round.appraisal_value != null ? toAmount(round.appraisal_value) : null;
    const discountPercent =
        appraisal !== null && appraisal > minimum ? Math.round(((appraisal - minimum) / appraisal) * 100) : 0;

    return (
        <div className="rounded-lg border border-primary bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-primary">{round.source_label || `${round.round_number}ª Praça`}</span>
                <RoundStatusBadge status={round.status} />
            </div>
            <dl className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between gap-3">
                    <dt className="flex items-center gap-1 text-muted-foreground">
                        <CalendarClock className="size-3.5" />
                        Início
                    </dt>
                    <dd className="text-foreground tabular-nums">
                        {round.starts_at ? new Date(round.starts_at).toLocaleString("pt-BR") : "A definir"}
                    </dd>
                </div>
                {round.ends_at && (
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Encerramento</dt>
                        <dd className="text-foreground tabular-nums">{new Date(round.ends_at).toLocaleString("pt-BR")}</dd>
                    </div>
                )}
            </dl>
            <p className="mt-3 text-xs tracking-wide text-muted-foreground uppercase">Lance mínimo</p>
            <p className="mt-1 text-2xl tracking-tight text-foreground tabular-nums">{formatCurrency(minimum)}</p>
            {appraisal !== null && appraisal > minimum && (
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs tabular-nums">
                    <span className="text-muted-foreground">Avaliação: {formatCurrency(appraisal)}</span>
                    <span className="text-success">{discountPercent}% de desconto</span>
                </p>
            )}
        </div>
    );
}

function AuctionDetail({ item }: { item: AuctionApiResource }) {
    const rounds = item.rounds && item.rounds.length > 0 ? item.rounds : item.round ? [item.round] : [];
    const address = [item.address, item.neighborhood, item.city].filter(Boolean).join(", ");
    const fullAddress = item.state ? `${address} - ${item.state}` : address;

    return (
        <>
            <DialogHeader className="gap-2 border-b px-6 py-5 text-left">
                <div className="flex flex-wrap items-center gap-2 pr-8">
                    <ModalityBadge modality={item.event.sale_modality} />
                    <RoundStatusBadge status={item.round?.status} />
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
                            Cronograma de praças
                        </h3>
                        {rounds.length > 0 ? (
                            <div className="space-y-2">
                                {rounds.map((round, index) => (
                                    <RoundCard key={`${round.round_number}-${index}`} round={round} />
                                ))}
                            </div>
                        ) : (
                            <p className="rounded-xl border border-transparent bg-muted p-4 text-sm text-muted-foreground">
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
                            {item.built_area_m2 && (
                                <div className="flex justify-between gap-4 px-4 py-2.5">
                                    <dt className="text-muted-foreground">Área privativa</dt>
                                    <dd className="text-right text-foreground tabular-nums">{item.built_area_m2} m²</dd>
                                </div>
                            )}
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
                        <div className="max-h-40 overflow-y-auto rounded-xl border border-transparent bg-muted p-4 text-sm text-muted-foreground">
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
                                Portal do leiloeiro
                            </a>
                        </Button>
                    )}
                </DialogFooter>
            )}
        </>
    );
}
