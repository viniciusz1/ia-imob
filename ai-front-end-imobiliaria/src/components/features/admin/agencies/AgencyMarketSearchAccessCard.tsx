"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import { getMarketSearchAccessOptions, updateMarketSearchAccess, type AgencySummary, type MarketSearchAccessOptions } from "@/services/adminApi";

export function AgencyMarketSearchAccessCard({ agency }: { agency: AgencySummary }) {
    const canEdit = usePermission("platform.agencies.update");
    const [cities, setCities] = useState(agency.market_search_access?.allowed_cities ?? []);
    const [sources, setSources] = useState<number[]>(agency.market_search_access?.allowed_crawl_agency_ids ?? []);
    const [allCities, setAllCities] = useState(agency.market_search_access?.allowed_cities == null);
    const [allSources, setAllSources] = useState(agency.market_search_access?.allowed_crawl_agency_ids == null);
    const [options, setOptions] = useState<MarketSearchAccessOptions | null>(null);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        let active = true;
        getMarketSearchAccessOptions().then(data => { if (active) setOptions(data); }).catch(() => { if (active) setError("Não foi possível carregar as opções."); });
        return () => { active = false; };
    }, []);
    const labels = options?.crawl_agencies.map(source => `${source.name} (${source.root_domain}) #${source.id}`) ?? [];
    const selectedLabels = options?.crawl_agencies.filter(source => sources.includes(source.id)).map(source => `${source.name} (${source.root_domain}) #${source.id}`) ?? [];
    async function save() {
        setSaving(true); setError("");
        try {
            await updateMarketSearchAccess(agency.id, { allowed_cities: allCities ? null : cities, allowed_crawl_agency_ids: allSources ? null : sources });
            toast.success("Catálogo permitido atualizado.");
        } catch { setError("Não foi possível salvar o catálogo permitido."); }
        finally { setSaving(false); }
    }
    return <Card>
        <CardHeader><CardTitle>Catálogo permitido no buscador</CardTitle></CardHeader>
        <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">Os imóveis devem estar nas cidades e nas imobiliárias permitidas. A regra vale para IA e Filtros.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {!options && !error && <p className="text-sm text-muted-foreground">Carregando opções...</p>}
            <div className="space-y-2">
                <div className="flex items-center gap-2"><Switch id="all-search-cities" checked={allCities} onCheckedChange={setAllCities} disabled={!canEdit || saving} /><Label htmlFor="all-search-cities">Todas as cidades</Label></div>
                {!allCities && <MultiSelect id="search-allowed-cities" options={Array.from(new Set([...(options?.cities ?? []), ...cities]))} value={cities} onChange={setCities} placeholder="Selecione cidades permitidas" disabled={!canEdit || !options || saving} />}
            </div>
            <div className="space-y-2">
                <div className="flex items-center gap-2"><Switch id="all-search-sources" checked={allSources} onCheckedChange={setAllSources} disabled={!canEdit || saving} /><Label htmlFor="all-search-sources">Todas as imobiliárias</Label></div>
                {!allSources && <MultiSelect id="search-allowed-sources" options={labels} value={selectedLabels} onChange={values => setSources((options?.crawl_agencies ?? []).filter(source => values.includes(`${source.name} (${source.root_domain}) #${source.id}`)).map(source => source.id))} placeholder="Selecione imobiliárias permitidas" disabled={!canEdit || !options || saving} />}
            </div>
            {canEdit && <Button disabled={saving || !options || (!allCities && cities.length === 0) || (!allSources && sources.length === 0)} onClick={() => void save()}>{saving ? "Salvando..." : "Salvar catálogo"}</Button>}
        </CardContent>
    </Card>;
}
