"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
    Gavel,
    FileText,
    Building,
    MapPin,
    ExternalLink,
    Search,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    Filter,
    BadgePercent,
    TrendingDown,
    Loader2,
    SlidersHorizontal,
    Bell,
    Calendar,
    DollarSign,
    Trash2,
    Check,
    BookmarkCheck
} from "lucide-react";
import { toast } from "sonner";

import {
    getAuctions,
    getAuctionAlerts,
    saveAuctionAlert,
    deleteAuctionAlert,
    type AuctionApiResource,
    type AuctionFiltersParams,
    type SavedAuctionAlert
} from "@/services/auctionService";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

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

export default function AuctionsPage() {
    const [auctions, setAuctions] = useState<AuctionApiResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Basic filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCity, setSelectedCity] = useState("Todas");
    const [selectedModality, setSelectedModality] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("created_at");

    // Advanced filters
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [minBid, setMinBid] = useState<string>("");
    const [maxBid, setMaxBid] = useState<string>("");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [selectedPropertyType, setSelectedPropertyType] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    // Details Modal
    const [activeModalItem, setActiveModalItem] = useState<AuctionApiResource | null>(null);

    // Alerts Management
    const [savedAlerts, setSavedAlerts] = useState<SavedAuctionAlert[]>([]);
    const [isCreateAlertOpen, setIsCreateAlertOpen] = useState(false);
    const [isViewAlertsOpen, setIsViewAlertsOpen] = useState(false);
    const [alertName, setAlertName] = useState("");
    const [isSavingAlert, setIsSavingAlert] = useState(false);

    // Load saved alerts on mount
    const loadAlerts = useCallback(async () => {
        try {
            const data = await getAuctionAlerts();
            setSavedAlerts(data);
        } catch {
            // User might be unauthenticated or service unavailable
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

        if (minBid) {
            const numericMin = parseFloat(minBid.replace(/\D/g, ""));
            if (!isNaN(numericMin) && numericMin > 0) params.min_bid = numericMin;
        }

        if (maxBid) {
            const numericMax = parseFloat(maxBid.replace(/\D/g, ""));
            if (!isNaN(numericMax) && numericMax > 0) params.max_bid = numericMax;
        }

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
        } else if (sortBy === "date_desc") {
            params.sort = "date";
            params.direction = "desc";
        } else if (sortBy === "discount_desc") {
            params.sort = "discount";
            params.direction = "desc";
        }

        return params;
    }, [
        searchTerm,
        selectedCity,
        selectedModality,
        selectedPropertyType,
        selectedStatus,
        minBid,
        maxBid,
        dateFrom,
        dateTo,
        sortBy,
    ]);

    const fetchAuctions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = buildFilterParams();
            const response = await getAuctions(params);
            setAuctions(response.data);
        } catch (err: unknown) {
            console.error("Failed to load auctions", err);
            setError("Não foi possível carregar os leilões no momento.");
        } finally {
            setIsLoading(false);
        }
    }, [buildFilterParams]);

    // Debounced fetch
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
            const minB = a.round?.minimum_bid ?? 0;
            const app = a.round?.appraisal_value ?? minB;
            if (minB < minPrice && minB > 0) minPrice = minB;
            if (app > minB) {
                sumDiscount += ((app - minB) / app) * 100;
            }
        }

        return {
            total,
            avgDiscount: total > 0 ? Math.round(sumDiscount / total) : 0,
            lowestPrice: minPrice === Infinity ? 0 : minPrice,
        };
    }, [auctions]);

    // Active filter count (excluding default values)
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (searchTerm.trim()) count++;
        if (selectedCity !== "Todas") count++;
        if (selectedModality !== "all") count++;
        if (selectedPropertyType !== "all") count++;
        if (selectedStatus !== "all") count++;
        if (minBid) count++;
        if (maxBid) count++;
        if (dateFrom) count++;
        if (dateTo) count++;
        return count;
    }, [
        searchTerm,
        selectedCity,
        selectedModality,
        selectedPropertyType,
        selectedStatus,
        minBid,
        maxBid,
        dateFrom,
        dateTo,
    ]);

    const clearAllFilters = () => {
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

    const handleSaveAlert = async () => {
        if (!alertName.trim()) {
            toast.error("Por favor, informe um nome para o alerta.");
            return;
        }

        setIsSavingAlert(true);
        try {
            const params = buildFilterParams();
            const newAlert = await saveAuctionAlert(alertName.trim(), params);
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

    // Quick range presets
    const setQuickBid = (min?: number, max?: number) => {
        setMinBid(min ? String(min) : "");
        setMaxBid(max ? String(max) : "");
    };

    const setQuickDateDays = (days: number) => {
        const today = new Date();
        const target = new Date();
        target.setDate(today.getDate() + days);

        setDateFrom(today.toISOString().split("T")[0]);
        setDateTo(target.toISOString().split("T")[0]);
    };

    return (
        <div className="container mx-auto py-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Gavel className="h-6 w-6 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Leilões & Oportunidades</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Busca avançada e alertas em leilões judiciais, extrajudiciais e licitações CAIXA.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsViewAlertsOpen(true)}
                        className="relative gap-2"
                    >
                        <Bell className="w-4 h-4 text-primary" />
                        Meus Alertas
                        {savedAlerts.length > 0 && (
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                {savedAlerts.length}
                            </Badge>
                        )}
                    </Button>
                    <Button
                        variant="default"
                        onClick={() => {
                            setAlertName(
                                selectedCity !== "Todas"
                                    ? `Leilões em ${selectedCity}`
                                    : "Novo Alerta de Leilões"
                            );
                            setIsCreateAlertOpen(true);
                        }}
                        className="gap-2"
                    >
                        <BookmarkCheck className="w-4 h-4" />
                        Criar Alerta
                    </Button>
                </div>
            </div>

            {/* Stats Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Oportunidades Ativas</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total} imóveis</div>
                        <p className="text-xs text-muted-foreground">Monitoramento e atualização contínua</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Desconto Médio</CardTitle>
                        <BadgePercent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-500">
                            ~{stats.avgDiscount}% OFF
                        </div>
                        <p className="text-xs text-muted-foreground">Sobre a avaliação pericial</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lances a partir de</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                stats.lowestPrice
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">1ª e 2ª praças abertas</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Search and Filter Card */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Busque por título, cidade, bairro, leiloeiro ou tribunal..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                                    title="Limpar busca"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <div className="w-full sm:w-[200px]">
                            <Select value={sortBy} onValueChange={(value: string) => setSortBy(value)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Ordenar por" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="created_at">Mais Recentes</SelectItem>
                                    <SelectItem value="price_asc">Menor Lance (R$)</SelectItem>
                                    <SelectItem value="price_desc">Maior Lance (R$)</SelectItem>
                                    <SelectItem value="date_asc">Praça Mais Próxima</SelectItem>
                                    <SelectItem value="discount_desc">Maior Desconto (%)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            variant={isAdvancedOpen ? "default" : "outline"}
                            onClick={() => setIsAdvancedOpen((prev) => !prev)}
                            className="gap-2 shrink-0"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Busca Avançada
                            {activeFilterCount > 0 && (
                                <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                                    {activeFilterCount}
                                </Badge>
                            )}
                        </Button>
                    </div>

                    {/* Standard quick filters */}
                    <div className="flex flex-wrap gap-3 items-center pt-1 border-t border-muted/50">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filtros Rápidos:</span>
                        </div>

                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                            <SelectTrigger className="w-[170px] h-8 text-xs">
                                <SelectValue placeholder="Cidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {CITIES.map((city) => (
                                    <SelectItem key={city} value={city}>
                                        {city}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedModality} onValueChange={setSelectedModality}>
                            <SelectTrigger className="w-[190px] h-8 text-xs">
                                <SelectValue placeholder="Modalidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {MODALITIES.map((m) => (
                                    <SelectItem key={m.value} value={m.value}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedPropertyType} onValueChange={setSelectedPropertyType}>
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder="Tipo de Imóvel" />
                            </SelectTrigger>
                            <SelectContent>
                                {PROPERTY_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {activeFilterCount > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllFilters}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                                Limpar Todos
                            </Button>
                        )}
                    </div>

                    {/* Expandable Advanced Filters Drawer */}
                    {isAdvancedOpen && (
                        <div className="pt-4 border-t space-y-4 bg-muted/20 p-4 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Bid Range Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                                        <DollarSign className="w-4 h-4 text-primary" />
                                        <span>Faixa de Lance Mínimo (R$)</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground">Lance Mínimo</label>
                                            <Input
                                                type="number"
                                                placeholder="Ex: 100000"
                                                value={minBid}
                                                onChange={(e) => setMinBid(e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Lance Máximo</label>
                                            <Input
                                                type="number"
                                                placeholder="Ex: 500000"
                                                value={maxBid}
                                                onChange={(e) => setMaxBid(e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickBid(undefined, 200000)}
                                            className="h-6 text-[11px] px-2"
                                        >
                                            Até R$ 200k
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickBid(200000, 500000)}
                                            className="h-6 text-[11px] px-2"
                                        >
                                            R$ 200k - R$ 500k
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickBid(500000, 1000000)}
                                            className="h-6 text-[11px] px-2"
                                        >
                                            R$ 500k - R$ 1M
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickBid(1000000, undefined)}
                                            className="h-6 text-[11px] px-2"
                                        >
                                            &gt; R$ 1M
                                        </Button>
                                    </div>
                                </div>

                                {/* Date Range Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-1.5 text-sm font-semibold">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <span>Data da Praça / Leilão</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-xs text-muted-foreground">A partir de</label>
                                            <Input
                                                type="date"
                                                value={dateFrom}
                                                onChange={(e) => setDateFrom(e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-muted-foreground">Até a data</label>
                                            <Input
                                                type="date"
                                                value={dateTo}
                                                onChange={(e) => setDateTo(e.target.value)}
                                                className="h-9 text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickDateDays(7)}
                                            className="h-6 text-[11px] px-2"
                                        >
                                            Próximos 7 dias
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickDateDays(30)}
                                            className="h-6 text-[11px] px-2"
                                        >
                                            Próximos 30 dias
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setQuickDateDays(60)}
                                            className="h-6 text-[11px] px-2"
                                        >
                                            Próximos 60 dias
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-muted/50">
                                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                                    Redefinir Filtros
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setAlertName(
                                            selectedCity !== "Todas"
                                                ? `Leilões em ${selectedCity}`
                                                : "Novo Alerta de Leilões"
                                        );
                                        setIsCreateAlertOpen(true);
                                    }}
                                    className="gap-1.5 text-xs"
                                >
                                    <Bell className="w-3.5 h-3.5" />
                                    Salvar como Alerta
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Active Filter Badges */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-1.5 items-center pt-2">
                            <span className="text-xs text-muted-foreground mr-1">Filtros aplicados:</span>

                            {selectedCity !== "Todas" && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    Cidade: {selectedCity}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCity("Todas")} />
                                </Badge>
                            )}
                            {selectedModality !== "all" && (
                                <Badge variant="secondary" className="gap-1 text-xs capitalize">
                                    Modalidade: {selectedModality.replace("_", " ")}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedModality("all")} />
                                </Badge>
                            )}
                            {selectedPropertyType !== "all" && (
                                <Badge variant="secondary" className="gap-1 text-xs capitalize">
                                    Tipo: {selectedPropertyType}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedPropertyType("all")} />
                                </Badge>
                            )}
                            {selectedStatus !== "all" && (
                                <Badge variant="secondary" className="gap-1 text-xs capitalize">
                                    Status: {selectedStatus}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedStatus("all")} />
                                </Badge>
                            )}
                            {minBid && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    Min: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(minBid))}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setMinBid("")} />
                                </Badge>
                            )}
                            {maxBid && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    Max: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(maxBid))}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setMaxBid("")} />
                                </Badge>
                            )}
                            {dateFrom && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    De: {new Date(dateFrom + "T00:00:00").toLocaleDateString("pt-BR")}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setDateFrom("")} />
                                </Badge>
                            )}
                            {dateTo && (
                                <Badge variant="secondary" className="gap-1 text-xs">
                                    Até: {new Date(dateTo + "T00:00:00").toLocaleDateString("pt-BR")}
                                    <X className="w-3 h-3 cursor-pointer" onClick={() => setDateTo("")} />
                                </Badge>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Encontrados <span className="font-bold text-foreground">{stats.total}</span> imóveis
                </p>
            </div>

            {/* Auction Cards Grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Buscando oportunidades em leilões...</p>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-red-500">
                    <AlertCircle className="h-10 w-10 mb-4" />
                    <h3 className="text-lg font-semibold">Erro</h3>
                    <p className="text-sm mt-2 max-w-sm">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={fetchAuctions}>
                        Tentar Novamente
                    </Button>
                </div>
            ) : auctions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-card p-6">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Nenhum leilão encontrado</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                        Nenhum imóvel corresponde aos filtros e faixas de lances selecionados.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={clearAllFilters}>
                        Limpar Filtros
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {auctions.map((item) => {
                        const photoUrl =
                            item.images?.[0] ??
                            "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";
                        const appraisal = item.round?.appraisal_value ?? item.round?.minimum_bid ?? 0;
                        const minBidVal = item.round?.minimum_bid ?? 0;
                        const discountPercent =
                            appraisal > minBidVal ? Math.round(((appraisal - minBidVal) / appraisal) * 100) : 0;
                        const roundStatus = item.round?.status ?? item.event.status;

                        return (
                            <Card
                                key={item.id}
                                className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow border-muted/80"
                            >
                                <div className="relative h-48 w-full bg-muted">
                                    <img
                                        src={photoUrl}
                                        alt={item.title || "Imóvel de Leilão"}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap">
                                        <Badge
                                            variant="secondary"
                                            className="shadow-sm capitalize backdrop-blur-md bg-background/80 text-[11px]"
                                        >
                                            {item.event.sale_modality.replace("_", " ")}
                                        </Badge>
                                        {roundStatus === "expired" || roundStatus === "closed" ? (
                                            <Badge variant="destructive" className="shadow-sm text-[11px]">
                                                Finalizado
                                            </Badge>
                                        ) : roundStatus === "open" ? (
                                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-[11px]">
                                                Aberto
                                            </Badge>
                                        ) : null}
                                    </div>
                                    {discountPercent > 0 && (
                                        <div className="absolute top-2 right-2">
                                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                                                -{discountPercent}%
                                            </Badge>
                                        </div>
                                    )}
                                </div>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        {item.occupancy_status === "vacant" ? (
                                            <Badge
                                                variant="outline"
                                                className="text-emerald-600 border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/20 text-[10px] py-0"
                                            >
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Desocupado
                                            </Badge>
                                        ) : item.occupancy_status === "occupied" ? (
                                            <Badge
                                                variant="outline"
                                                className="text-amber-600 border-amber-600/30 bg-amber-50 dark:bg-amber-950/20 text-[10px] py-0"
                                            >
                                                <Clock className="w-3 h-3 mr-1" /> Ocupado
                                            </Badge>
                                        ) : null}
                                    </div>
                                    <CardTitle className="text-base line-clamp-2 leading-tight" title={item.title}>
                                        {item.title}
                                    </CardTitle>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        <span className="truncate">
                                            {item.neighborhood ? `${item.neighborhood}, ${item.city}` : item.city}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-2 flex-1 flex flex-col justify-end">
                                    <div className="space-y-1 mb-4 text-xs text-muted-foreground">
                                        {item.built_area_m2 && (
                                            <div className="flex justify-between">
                                                <span>Área Construída:</span>
                                                <span className="font-medium text-foreground">
                                                    {item.built_area_m2} m²
                                                </span>
                                            </div>
                                        )}
                                        {item.land_area_m2 && (
                                            <div className="flex justify-between">
                                                <span>Área Total:</span>
                                                <span className="font-medium text-foreground">
                                                    {item.land_area_m2} m²
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span>Praça / Data:</span>
                                            <span className="font-medium text-foreground">
                                                {item.round?.starts_at
                                                    ? new Date(item.round.starts_at).toLocaleDateString("pt-BR")
                                                    : "A definir"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                            Lance
                                        </p>
                                        <div className="text-lg font-bold text-foreground mt-0.5">
                                            {new Intl.NumberFormat("pt-BR", {
                                                style: "currency",
                                                currency: "BRL",
                                            }).format(minBidVal)}
                                        </div>
                                        {appraisal > minBidVal && (
                                            <p className="text-xs text-muted-foreground line-through mt-0.5">
                                                {new Intl.NumberFormat("pt-BR", {
                                                    style: "currency",
                                                    currency: "BRL",
                                                }).format(appraisal)}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 pt-0 gap-2">
                                    <Button
                                        variant="default"
                                        className="w-full"
                                        onClick={() => setActiveModalItem(item)}
                                    >
                                        Ver Detalhes
                                    </Button>
                                    {item.canonical_url && (
                                        <Button variant="outline" size="icon" asChild>
                                            <a
                                                href={item.canonical_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Ver no Portal Oficial"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Details Modal with Multi-round details */}
            <Dialog open={!!activeModalItem} onOpenChange={(open) => !open && setActiveModalItem(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {activeModalItem && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="uppercase">
                                        {activeModalItem.event.sale_modality.replace("_", " ")}
                                    </Badge>
                                    {activeModalItem.round?.status && (
                                        <Badge
                                            variant={
                                                activeModalItem.round.status === "expired" ||
                                                activeModalItem.round.status === "closed"
                                                    ? "destructive"
                                                    : "outline"
                                            }
                                        >
                                            {activeModalItem.round.status}
                                        </Badge>
                                    )}
                                </div>
                                <DialogTitle className="text-xl">{activeModalItem.title}</DialogTitle>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <MapPin className="w-4 h-4 shrink-0" />
                                    {activeModalItem.address
                                        ? `${activeModalItem.address}, `
                                        : ""}
                                    {activeModalItem.neighborhood
                                        ? `${activeModalItem.neighborhood}, `
                                        : ""}
                                    {activeModalItem.city} - {activeModalItem.state}
                                </p>
                            </DialogHeader>

                            <div className="rounded-lg overflow-hidden h-64 bg-muted">
                                <img
                                    src={
                                        activeModalItem.images?.[0] ??
                                        "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80"
                                    }
                                    alt="Imóvel"
                                    className="w-full h-full object-cover"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold text-sm mb-3">Cronograma de Praças</h3>
                                    <div className="space-y-2">
                                        {(activeModalItem.rounds && activeModalItem.rounds.length > 0
                                            ? activeModalItem.rounds
                                            : activeModalItem.round
                                            ? [activeModalItem.round]
                                            : []
                                        ).map((r, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-lg border bg-muted/30 space-y-1 text-xs"
                                            >
                                                <div className="flex justify-between font-semibold">
                                                    <span>{r.source_label || `${r.round_number}ª Praça`}</span>
                                                    <Badge
                                                        variant={
                                                            r.status === "expired" || r.status === "closed"
                                                                ? "destructive"
                                                                : "outline"
                                                        }
                                                        className="text-[10px] py-0"
                                                    >
                                                        {r.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>Data de Início:</span>
                                                    <span className="font-medium text-foreground">
                                                        {r.starts_at
                                                            ? new Date(r.starts_at).toLocaleString("pt-BR")
                                                            : "A definir"}
                                                    </span>
                                                </div>
                                                {r.ends_at && (
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>Encerramento:</span>
                                                        <span className="font-medium text-foreground">
                                                            {new Date(r.ends_at).toLocaleString("pt-BR")}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between pt-1 border-t">
                                                    <span className="font-medium">Lance Mínimo:</span>
                                                    <span className="text-sm font-bold text-foreground">
                                                        {new Intl.NumberFormat("pt-BR", {
                                                            style: "currency",
                                                            currency: "BRL",
                                                        }).format(r.minimum_bid ?? 0)}
                                                    </span>
                                                </div>
                                                {r.appraisal_value && r.appraisal_value > (r.minimum_bid ?? 0) && (
                                                    <div className="text-[11px] text-emerald-600 dark:text-emerald-500">
                                                        Avaliação:{" "}
                                                        {new Intl.NumberFormat("pt-BR", {
                                                            style: "currency",
                                                            currency: "BRL",
                                                        }).format(r.appraisal_value)}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-sm mb-2">Informações Adicionais</h3>
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Leiloeiro:</span>
                                                <span className="font-medium text-right ml-4">
                                                    {activeModalItem.event.auctioneer_name || "N/D"}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Ocupação:</span>
                                                <span className="font-medium capitalize">
                                                    {activeModalItem.occupancy_status}
                                                </span>
                                            </div>
                                            {activeModalItem.built_area_m2 && (
                                                <div className="flex justify-between border-b pb-1">
                                                    <span className="text-muted-foreground">Área Privativa:</span>
                                                    <span className="font-medium">
                                                        {activeModalItem.built_area_m2} m²
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {activeModalItem.description && (
                                        <div>
                                            <h3 className="font-semibold text-sm mb-2">Descrição / Laudo</h3>
                                            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg max-h-32 overflow-y-auto">
                                                {activeModalItem.description}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4 pt-4 border-t">
                                {activeModalItem.notice_url && (
                                    <Button variant="outline" asChild>
                                        <a
                                            href={activeModalItem.notice_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            Ver Edital Oficial
                                        </a>
                                    </Button>
                                )}
                                {activeModalItem.canonical_url && (
                                    <Button asChild>
                                        <a
                                            href={activeModalItem.canonical_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Portal do Leiloeiro
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create Alert Dialog */}
            <Dialog open={isCreateAlertOpen} onOpenChange={setIsCreateAlertOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            Criar Alerta de Leilão
                        </DialogTitle>
                        <DialogDescription>
                            Receba alertas e salve este conjunto de filtros para monitorar novos imóveis.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-xs font-semibold">Nome do Alerta</label>
                            <Input
                                placeholder="Ex: Leilões em Jaraguá até R$ 300k"
                                value={alertName}
                                onChange={(e) => setAlertName(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div className="bg-muted/40 p-3 rounded-lg text-xs space-y-1">
                            <span className="font-semibold text-muted-foreground">Critérios deste alerta:</span>
                            <ul className="list-disc list-inside space-y-0.5 text-muted-foreground pt-1">
                                <li>Cidade: {selectedCity}</li>
                                <li>Modalidade: {selectedModality === "all" ? "Todas" : selectedModality}</li>
                                <li>Tipo: {selectedPropertyType === "all" ? "Todos" : selectedPropertyType}</li>
                                {minBid && <li>Lance Mínimo: R$ {minBid}</li>}
                                {maxBid && <li>Lance Máximo: R$ {maxBid}</li>}
                                {dateFrom && <li>A partir de: {dateFrom}</li>}
                                {dateTo && <li>Até: {dateTo}</li>}
                            </ul>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateAlertOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveAlert} disabled={isSavingAlert} className="gap-2">
                            {isSavingAlert ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Salvar Alerta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Saved Alerts Dialog */}
            <Dialog open={isViewAlertsOpen} onOpenChange={setIsViewAlertsOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="w-5 h-5 text-primary" />
                            Meus Alertas de Leilões
                        </DialogTitle>
                        <DialogDescription>
                            Seus filtros salvos para monitoramento contínuo de oportunidades.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
                        {savedAlerts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Nenhum alerta salvo ainda.</p>
                                <p className="text-xs mt-1">Configure filtros na tela e clique em &quot;Criar Alerta&quot;.</p>
                            </div>
                        ) : (
                            savedAlerts.map((alert) => (
                                <div
                                    key={alert.id}
                                    className="p-3 border rounded-lg flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                                >
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-semibold">{alert.name}</h4>
                                        <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                                            {alert.filters.city && <span>{alert.filters.city} •</span>}
                                            {alert.filters.modality && (
                                                <span>{alert.filters.modality} •</span>
                                            )}
                                            {alert.filters.max_bid && (
                                                <span>
                                                    Até{" "}
                                                    {new Intl.NumberFormat("pt-BR", {
                                                        style: "currency",
                                                        currency: "BRL",
                                                    }).format(alert.filters.max_bid)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleApplyAlert(alert)}
                                            className="text-xs h-8"
                                        >
                                            Aplicar
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDeleteAlert(alert.id)}
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                            title="Excluir alerta"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsViewAlertsOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
