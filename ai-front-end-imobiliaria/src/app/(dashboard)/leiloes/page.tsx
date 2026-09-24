"use client";

import { useState, useEffect, useMemo } from "react";
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
    Loader2
} from "lucide-react";

import { getAuctions, type AuctionApiResource } from "@/services/auctionService";

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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CITIES = ["Todas", "Jaraguá do Sul", "Guaramirim", "Schroeder", "Corupá"];
const MODALITIES: { label: string; value: string }[] = [
    { label: "Todas Modalidades", value: "all" },
    { label: "Judicial", value: "judicial" },
    { label: "Extrajudicial", value: "extrajudicial" },
    { label: "Administrativa / CAIXA", value: "administrative" },
    { label: "Venda Direta / Online", value: "direct_sale" },
];

export default function AuctionsPage() {
    const [auctions, setAuctions] = useState<AuctionApiResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCity, setSelectedCity] = useState("Todas");
    const [selectedModality, setSelectedModality] = useState<string>("all");
    const [sortBy, setSortBy] = useState<string>("created_at");
    const [activeModalItem, setActiveModalItem] = useState<AuctionApiResource | null>(null);

    const fetchAuctions = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params: any = {};
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
    };

    // Use effect with debounce for search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAuctions();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm, selectedCity, selectedModality, sortBy]);

    const stats = useMemo(() => {
        const total = auctions.length;
        let sumDiscount = 0;
        let minPrice = Infinity;

        for (const a of auctions) {
            const minBid = a.round?.minimum_bid ?? 0;
            const app = a.round?.appraisal_value ?? minBid;
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

    const clearFilters = () => {
        setSearchTerm("");
        setSelectedCity("Todas");
        setSelectedModality("all");
    };

    return (
        <div className="container mx-auto py-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Gavel className="h-6 w-6 text-primary" />
                        <h1 className="text-3xl font-bold tracking-tight">Leilões</h1>
                    </div>
                    <p className="text-muted-foreground mt-1">
                        Descubra oportunidades em leilões judiciais, extrajudiciais e CAIXA.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
                        <Building className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total} imóveis</div>
                        <p className="text-xs text-muted-foreground">Monitoramento contínuo</p>
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
                        <p className="text-xs text-muted-foreground">Sobre avaliação pericial</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lances a partir de</CardTitle>
                        <TrendingDown className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.lowestPrice)}
                        </div>
                        <p className="text-xs text-muted-foreground">Praças ativas</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Busque por título, cidade, bairro..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
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
                                    <SelectItem value="price_asc">Menor Preço</SelectItem>
                                    <SelectItem value="price_desc">Maior Preço</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 items-center pt-2">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-muted-foreground"/>
                            <span className="text-sm font-medium text-muted-foreground">Filtros:</span>
                        </div>
                        
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Cidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {CITIES.map(city => (
                                    <SelectItem key={city} value={city}>{city}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={selectedModality} onValueChange={(v: string) => setSelectedModality(v)}>
                            <SelectTrigger className="w-[200px] h-8 text-xs">
                                <SelectValue placeholder="Modalidade" />
                            </SelectTrigger>
                            <SelectContent>
                                {MODALITIES.map(m => (
                                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        {(searchTerm || selectedCity !== "Todas" || selectedModality !== "all") && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                                Limpar Filtros
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Encontrados <span className="font-bold text-foreground">{stats.total}</span> imóveis
                </p>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-red-500">
                    <AlertCircle className="h-10 w-10 mb-4" />
                    <h3 className="text-lg font-semibold">Erro</h3>
                    <p className="text-sm mt-2 max-w-sm">{error}</p>
                </div>
            ) : auctions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Nenhum imóvel encontrado</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                        Tente alterar os termos de busca ou remover os filtros aplicados.
                    </p>
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                        Limpar Filtros
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {auctions.map((item) => {
                        const photoUrl = item.images?.[0] ?? "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";
                        const appraisal = item.round?.appraisal_value ?? item.round?.minimum_bid ?? 0;
                        const minBid = item.round?.minimum_bid ?? 0;
                        const discountPercent = appraisal > minBid ? Math.round(((appraisal - minBid) / appraisal) * 100) : 0;

                        return (
                            <Card key={item.id} className="overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                                <div className="relative h-48 w-full bg-muted">
                                    <img
                                        src={photoUrl}
                                        alt={item.title || "Imóvel de Leilão"}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="absolute top-2 left-2 flex gap-2">
                                        <Badge variant="secondary" className="shadow-sm capitalize backdrop-blur-md bg-background/80">
                                            {item.event.sale_modality.replace("_", " ")}
                                        </Badge>
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
                                            <Badge variant="outline" className="text-emerald-600 border-emerald-600/30 bg-emerald-50 text-[10px] py-0">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Desocupado
                                            </Badge>
                                        ) : item.occupancy_status === "occupied" ? (
                                            <Badge variant="outline" className="text-amber-600 border-amber-600/30 bg-amber-50 text-[10px] py-0">
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
                                                <span className="font-medium text-foreground">{item.built_area_m2} m²</span>
                                            </div>
                                        )}
                                        {item.land_area_m2 && (
                                            <div className="flex justify-between">
                                                <span>Área Total:</span>
                                                <span className="font-medium text-foreground">{item.land_area_m2} m²</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span>Praça:</span>
                                            <span className="font-medium text-foreground">
                                                {item.round?.starts_at ? new Date(item.round.starts_at).toLocaleDateString("pt-BR") : "A definir"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                                            Lance
                                        </p>
                                        <div className="text-lg font-bold text-foreground mt-0.5">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(minBid)}
                                        </div>
                                        {appraisal > minBid && (
                                            <p className="text-xs text-muted-foreground line-through mt-0.5">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appraisal)}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="p-4 pt-0 gap-2">
                                    <Button variant="default" className="w-full" onClick={() => setActiveModalItem(item)}>
                                        Ver Detalhes
                                    </Button>
                                    {item.canonical_url && (
                                        <Button variant="outline" size="icon" asChild>
                                            <a href={item.canonical_url} target="_blank" rel="noopener noreferrer" title="Ver no Portal Oficial">
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

            <Dialog open={!!activeModalItem} onOpenChange={(open) => !open && setActiveModalItem(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    {activeModalItem && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary" className="uppercase">
                                        {activeModalItem.event.sale_modality.replace("_", " ")}
                                    </Badge>
                                </div>
                                <DialogTitle className="text-xl">
                                    {activeModalItem.title}
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                                    <MapPin className="w-4 h-4 shrink-0" />
                                    {activeModalItem.address}, {activeModalItem.neighborhood}, {activeModalItem.city} - {activeModalItem.state}
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
                                    <h3 className="font-semibold text-sm mb-3">Detalhes do Leilão</h3>
                                    <div className="space-y-3">
                                        {activeModalItem.round && (
                                            <div className="p-3 rounded-lg border bg-muted/30">
                                                <div className="flex justify-between text-xs font-medium mb-1">
                                                    <span>{activeModalItem.round.round_number}ª Praça</span>
                                                    <span className="text-muted-foreground">
                                                        {activeModalItem.round.starts_at ? new Date(activeModalItem.round.starts_at).toLocaleString("pt-BR") : "A definir"}
                                                    </span>
                                                </div>
                                                <div className="text-base font-bold">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeModalItem.round.minimum_bid ?? 0)}
                                                </div>
                                                {activeModalItem.round.appraisal_value && (activeModalItem.round.appraisal_value > (activeModalItem.round.minimum_bid ?? 0)) && (
                                                    <div className="text-xs text-emerald-600 mt-1">
                                                        Avaliação: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeModalItem.round.appraisal_value)}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <h3 className="font-semibold text-sm mb-2">Informações Adicionais</h3>
                                        <div className="text-sm space-y-2">
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Leiloeiro:</span>
                                                <span className="font-medium text-right ml-4">{activeModalItem.event.auctioneer_name || "N/D"}</span>
                                            </div>
                                            <div className="flex justify-between border-b pb-1">
                                                <span className="text-muted-foreground">Ocupação:</span>
                                                <span className="font-medium capitalize">{activeModalItem.occupancy_status}</span>
                                            </div>
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
                                        <a href={activeModalItem.notice_url} target="_blank" rel="noopener noreferrer">
                                            <FileText className="w-4 h-4 mr-2" />
                                            Ver Edital
                                        </a>
                                    </Button>
                                )}
                                {activeModalItem.canonical_url && (
                                    <Button asChild>
                                        <a href={activeModalItem.canonical_url} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink className="w-4 h-4 mr-2" />
                                            Portal Oficial
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
