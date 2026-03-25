"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PropertyCard } from "./PropertyCard";
import { PropertyFilters } from "./PropertyFilters";
import {
  type AiSearcherProperty,
  type AiSearcherFiltersState,
} from "./types";
import api from "@/services/api";

const ITEMS_PER_PAGE = 20;

// --- URL param helpers ---

function getStringArrayParam(params: URLSearchParams, key: string): string[] {
  return params.getAll(key).filter(Boolean);
}

function getNumberArrayParam(params: URLSearchParams, key: string): number[] {
  return params
    .getAll(key)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
}

function setArrayParam(
  params: URLSearchParams,
  key: string,
  values: Array<string | number>
) {
  params.delete(key);
  values.forEach((v) => params.append(key, String(v)));
}

function areArrayParamsEqual(
  a: URLSearchParams,
  b: URLSearchParams,
  key: string
): boolean {
  const left = a.getAll(key);
  const right = b.getAll(key);
  if (left.length !== right.length) return false;
  return left.every((v, i) => v === right[i]);
}

function didFilterParamsChange(
  prev: URLSearchParams,
  next: URLSearchParams
): boolean {
  if (!areArrayParamsEqual(prev, next, "tipo")) return true;
  if (!areArrayParamsEqual(prev, next, "bairro")) return true;
  if (!areArrayParamsEqual(prev, next, "cidade")) return true;
  if (!areArrayParamsEqual(prev, next, "imobiliaria")) return true;
  if (!areArrayParamsEqual(prev, next, "quartos")) return true;
  if ((prev.get("min") ?? "") !== (next.get("min") ?? "")) return true;
  if ((prev.get("max") ?? "") !== (next.get("max") ?? "")) return true;
  return false;
}

function buildFilterStateFromUrl(
  params: URLSearchParams
): AiSearcherFiltersState {
  return {
    selectedTipos: getStringArrayParam(params, "tipo"),
    selectedBairros: getStringArrayParam(params, "bairro"),
    selectedCidades: getStringArrayParam(params, "cidade"),
    selectedImobiliarias: getStringArrayParam(params, "imobiliaria"),
    selectedQuartos: getNumberArrayParam(params, "quartos"),
    minPrice: params.get("min") ?? "",
    maxPrice: params.get("max") ?? "",
  };
}

export function AiSearcherClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [properties, setProperties] = useState<AiSearcherProperty[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Parse page from URL
  const pageParam = Number(searchParams.get("pagina") ?? "1");
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  useEffect(() => {
    async function fetchProperties() {
      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams(searchParams.toString());
        // Map frontend "pagina" to backend "page" (Laravel default for pagination)
        if (queryParams.has("pagina")) {
          queryParams.set("page", queryParams.get("pagina")!);
          queryParams.delete("pagina");
        }

        const response = await api.get(`/api/scrapy-properties?${queryParams.toString()}`);
        
        // Laravel's API Resource pagination format
        const data = response.data.data.map((item: any) => ({
          id: item.id,
          image: item.image || "",
          tipo: item.tipo || "",
          preco: Number(item.preco) || 0,
          bairro: item.bairro || "",
          cidade: item.cidade || "",
          imobiliaria: item.imobiliaria || "",
          quartos: item.quartos || 0,
          areaPrivativa: Number(item.areaPrivativa) || 0,
          descricao: item.descricao || "",
          link_imovel: item.link_imovel || "",
        }));

        setProperties(data);
        setTotalPages(response.data.meta?.last_page || 1);
        setTotalItems(response.data.meta?.total || 0);
      } catch (error) {
        console.error("Erro ao buscar imóveis:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProperties();
  }, [searchParams]);

  const filtersFromUrl = useMemo(
    () => buildFilterStateFromUrl(searchParams),
    [searchParams]
  );

  const sortOrderParam = searchParams.get("ordem");
  const sortOrder =
    sortOrderParam === "asc" || sortOrderParam === "desc"
      ? sortOrderParam
      : "none";

  const effectivePage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));

  // --- Next.js URL update helper ---
  const pushSearchParams = useCallback(
    (updater: (params: URLSearchParams) => URLSearchParams, replace = false) => {
      const currentParamsStr = searchParams.toString();
      const newParams = updater(new URLSearchParams(currentParamsStr));
      const newParamsStr = newParams.toString();

      if (currentParamsStr === newParamsStr) {
        return; // Break infinite loop
      }

      const url = `${pathname}?${newParamsStr}`;
      if (replace) {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [searchParams, pathname, router]
  );

  const handleFilterChange = useCallback((filtered: AiSearcherProperty[]) => {
    // Client-side filtering is now disabled; filtering is handled by the backend API via URL Sync
  }, []);

  const handleFilterStateChange = useCallback(
    (state: AiSearcherFiltersState) => {
      pushSearchParams((nextParams) => {
        const prev = new URLSearchParams(searchParams.toString());

        setArrayParam(nextParams, "tipo", state.selectedTipos);
        setArrayParam(nextParams, "bairro", state.selectedBairros);
        setArrayParam(nextParams, "cidade", state.selectedCidades);
        setArrayParam(nextParams, "imobiliaria", state.selectedImobiliarias);
        setArrayParam(nextParams, "quartos", state.selectedQuartos);

        if (state.minPrice) {
          nextParams.set("min", state.minPrice);
        } else {
          nextParams.delete("min");
        }
        if (state.maxPrice) {
          nextParams.set("max", state.maxPrice);
        } else {
          nextParams.delete("max");
        }

        // Keep sort order
        const ordem = prev.get("ordem");
        if (ordem) nextParams.set("ordem", ordem);

        if (didFilterParamsChange(prev, nextParams)) {
          nextParams.delete("pagina");
        } else {
          const pagina = prev.get("pagina");
          if (pagina) nextParams.set("pagina", pagina);
        }

        return nextParams;
      }, true);
    },
    [pushSearchParams, searchParams]
  );

  const handleSortChange = useCallback(
    (value: string) => {
      pushSearchParams((nextParams) => {
        // keep all current params
        const current = new URLSearchParams(searchParams.toString());
        const result = new URLSearchParams(current.toString());

        if (value === "asc" || value === "desc") {
          result.set("ordem", value);
        } else {
          result.delete("ordem");
        }
        result.delete("pagina");
        return result;
      });
    },
    [pushSearchParams, searchParams]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      pushSearchParams((nextParams) => {
        const result = new URLSearchParams(searchParams.toString());
        if (page <= 1) {
          result.delete("pagina");
        } else {
          result.set("pagina", String(page));
        }
        return result;
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pushSearchParams, searchParams]
  );

  // Correct page if out of range
  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      pushSearchParams((params) => {
        const result = new URLSearchParams(searchParams.toString());
        result.delete("pagina");
        return result;
      }, true);
      return;
    }

    if (totalPages > 0 && currentPage !== effectivePage) {
      pushSearchParams((params) => {
        const result = new URLSearchParams(searchParams.toString());
        if (effectivePage <= 1) {
          result.delete("pagina");
        } else {
          result.set("pagina", String(effectivePage));
        }
        return result;
      }, true);
    }
  }, [currentPage, effectivePage, pushSearchParams, searchParams, totalPages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground animate-pulse">Carregando imóveis da base de dados...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar com filtros */}
      <aside className="lg:w-80 shrink-0">
        <PropertyFilters
          properties={properties}
          onFilterChange={handleFilterChange}
          initialState={filtersFromUrl}
          onFilterStateChange={handleFilterStateChange}
        />
      </aside>

      {/* Lista de imóveis */}
      <main className="flex-1 min-w-0">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Imóveis Disponíveis
            </h2>
            <p className="text-muted-foreground mt-1">
              {totalItems}{" "}
              {totalItems === 1
                ? "imóvel encontrado"
                : "imóveis encontrados"}
              {totalPages > 1 &&
                ` — Página ${effectivePage} de ${totalPages}`}
            </p>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="sort-select"
              className="text-sm text-muted-foreground whitespace-nowrap"
            >
              Ordenar por:
            </label>
            <Select value={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger id="sort-select" className="w-[200px]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Padrão</SelectItem>
                <SelectItem value="asc">Menor valor</SelectItem>
                <SelectItem value="desc">Maior valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>

        {/* Empty state */}
        {properties.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xl text-muted-foreground">
              Nenhum imóvel encontrado com os filtros selecionados.
            </p>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <Button
              onClick={() => handlePageChange(effectivePage - 1)}
              disabled={effectivePage === 1}
              variant="outline"
              className="flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= effectivePage - 2 && page <= effectivePage + 2)
                  ) {
                    return (
                      <Button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        variant={
                          effectivePage === page ? "default" : "outline"
                        }
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    );
                  } else if (
                    page === effectivePage - 3 ||
                    page === effectivePage + 3
                  ) {
                    return (
                      <span
                        key={page}
                        className="px-2 text-muted-foreground self-center"
                      >
                        ...
                      </span>
                    );
                  }
                  return null;
                }
              )}
            </div>

            <Button
              onClick={() => handlePageChange(effectivePage + 1)}
              disabled={effectivePage === totalPages}
              variant="outline"
              className="flex items-center gap-1"
            >
              Próxima
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
