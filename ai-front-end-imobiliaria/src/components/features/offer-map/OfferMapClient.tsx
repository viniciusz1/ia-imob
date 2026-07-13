"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Map as MapIcon, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { OfferMapFilters } from "./OfferMapFilters";
import { OfferMapList } from "./OfferMapList";
import { NeighborhoodPanel } from "./NeighborhoodPanel";
import { NeighborhoodComparePanel } from "./NeighborhoodComparePanel";
import { getOfferMap } from "@/services/offerMapService";
import type {
  OfferMapFilters as OfferMapFiltersType,
  OfferMapLayer,
  OfferMapResponse,
  NeighborhoodMetric,
} from "@/types/offerMap";

const LAYER_OPTIONS: { value: OfferMapLayer; label: string }[] = [
  { value: "stock", label: "Quantidade de estoque" },
  { value: "type", label: "Tipologia predominante" },
  { value: "price", label: "Faixa de preço predominante" },
  { value: "profile", label: "Perfil predominante" },
  { value: "concentration", label: "Concentração relativa" },
];

function getStringArrayParam(params: URLSearchParams, key: string): string[] {
  return params.getAll(key + "[]").filter(Boolean);
}

function getNumberArrayParam(params: URLSearchParams, key: string): number[] {
  return params
    .getAll(key + "[]")
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
}

function setArrayParam(
  params: URLSearchParams,
  key: string,
  values: Array<string | number>,
) {
  const bracketKey = key + "[]";
  params.delete(bracketKey);
  values.forEach((v) => params.append(bracketKey, String(v)));
}

function buildFiltersFromUrl(params: URLSearchParams): OfferMapFiltersType {
  return {
    city: params.get("city") ?? "",
    tipo: getStringArrayParam(params, "tipo"),
    quartos: getNumberArrayParam(params, "quartos"),
    vagas: getNumberArrayParam(params, "vagas"),
    min_price: params.get("min_price")
      ? Number(params.get("min_price"))
      : undefined,
    max_price: params.get("max_price")
      ? Number(params.get("max_price"))
      : undefined,
    min_area: params.get("min_area")
      ? Number(params.get("min_area"))
      : undefined,
    max_area: params.get("max_area")
      ? Number(params.get("max_area"))
      : undefined,
  };
}

function buildUrlParams(
  filters: OfferMapFiltersType,
  layer: OfferMapLayer,
  selected: string[],
  concentrationType?: string,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.city) {
    params.set("city", filters.city);
  }

  params.set("layer", layer);

  if (concentrationType) {
    params.set("concentration_type", concentrationType);
  }

  setArrayParam(params, "tipo", filters.tipo ?? []);
  setArrayParam(params, "quartos", filters.quartos ?? []);
  setArrayParam(params, "vagas", filters.vagas ?? []);

  if (filters.min_price !== undefined) {
    params.set("min_price", String(filters.min_price));
  }

  if (filters.max_price !== undefined) {
    params.set("max_price", String(filters.max_price));
  }

  if (filters.min_area !== undefined) {
    params.set("min_area", String(filters.min_area));
  }

  if (filters.max_area !== undefined) {
    params.set("max_area", String(filters.max_area));
  }

  selected.forEach((name) => params.append("selected[]", name));

  return params;
}

function getSelectedNeighborhoods(params: URLSearchParams): string[] {
  return params.getAll("selected[]").filter(Boolean);
}

export function OfferMapClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<OfferMapFiltersType>(() =>
    buildFiltersFromUrl(searchParams),
  );
  const [layer, setLayer] = useState<OfferMapLayer>(
    (searchParams.get("layer") as OfferMapLayer) ?? "stock",
  );
  const [concentrationType, setConcentrationType] = useState<string>(
    searchParams.get("concentration_type") ?? "Casa",
  );
  const [selected, setSelected] = useState<string[]>(() =>
    getSelectedNeighborhoods(searchParams),
  );

  const [data, setData] = useState<OfferMapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!filters.city) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getOfferMap(
        filters,
        layer,
        layer === "concentration" ? concentrationType : undefined,
      );
      setData(response);
    } catch {
      setError("Não foi possível carregar o mapa de oferta.");
    } finally {
      setLoading(false);
    }
  }, [filters, layer, concentrationType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = buildUrlParams(filters, layer, selected, concentrationType);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [filters, layer, selected, concentrationType, router, pathname]);

  const handleFiltersChange = useCallback(
    (next: Partial<OfferMapFiltersType>) => {
      setFilters((prev) => ({ ...prev, ...next }));
    },
    [],
  );

  const toggleSelection = useCallback((name: string) => {
    setSelected((prev) => {
      if (prev.includes(name)) {
        return prev.filter((n) => n !== name);
      }

      if (prev.length >= 3) {
        return prev;
      }

      return [...prev, name];
    });
  }, []);

  const selectedNeighborhoods = useMemo<NeighborhoodMetric[]>(() => {
    if (!data) return [];

    return data.neighborhoods.filter((n) => selected.includes(n.name));
  }, [data, selected]);

  const activeNeighborhood = useMemo<NeighborhoodMetric | null>(() => {
    if (!data || selected.length !== 1) return null;

    return data.neighborhoods.find((n) => n.name === selected[0]) ?? null;
  }, [data, selected]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MapIcon className="h-6 w-6" />
            Mapa de Oferta
          </h1>
          <p className="text-muted-foreground">
            Distribuição espacial dos anúncios por bairro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Camada:</span>
          <Select value={layer} onValueChange={(v) => setLayer(v as OfferMapLayer)}>
            <SelectTrigger className="w-[240px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LAYER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {layer === "concentration" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipologia:</span>
          <Select
            value={concentrationType}
            onValueChange={setConcentrationType}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Casa">Casa</SelectItem>
              <SelectItem value="Apartamento">Apartamento</SelectItem>
              <SelectItem value="Geminado">Geminado</SelectItem>
              <SelectItem value="Terreno">Terreno</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <OfferMapFilters filters={filters} onChange={handleFiltersChange} />

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <OfferMapList
              data={data}
              layer={layer}
              selected={selected}
              onToggle={toggleSelection}
            />
          </div>

          <div className="space-y-4">
            {activeNeighborhood && <NeighborhoodPanel neighborhood={activeNeighborhood} />}

            {selectedNeighborhoods.length > 1 && (
              <NeighborhoodComparePanel neighborhoods={selectedNeighborhoods} />
            )}
          </div>
        </div>
      )}

      {!loading && !error && !data && (
        <div className="rounded-lg border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            Selecione uma cidade para visualizar o mapa de oferta.
          </p>
        </div>
      )}
    </div>
  );
}
