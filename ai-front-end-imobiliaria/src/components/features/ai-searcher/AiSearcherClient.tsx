"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PropertyCard } from "./PropertyCard";
import { PropertyFilters } from "./PropertyFilters";
import { AiPromptInput } from "./AiPromptInput";
import {
  type AiSearcherProperty,
  type AiSearcherFiltersState,
  type SearchMode,
  type AiSearchResponse,
} from "./types";
import api, { API_PREFIX } from "@/services/api";

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
  values: Array<string | number>
) {
  const bracketKey = key + "[]";
  params.delete(bracketKey);
  values.forEach((v) => params.append(bracketKey, String(v)));
}

function areArrayParamsEqual(
  a: URLSearchParams,
  b: URLSearchParams,
  key: string
): boolean {
  const left = a.getAll(key + "[]");
  const right = b.getAll(key + "[]");
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
  if (!areArrayParamsEqual(prev, next, "suites")) return true;
  if (!areArrayParamsEqual(prev, next, "banheiros")) return true;
  if (!areArrayParamsEqual(prev, next, "vagas")) return true;
  if (!areArrayParamsEqual(prev, next, "comodidade")) return true;
  if ((prev.get("quartos_plus") ?? "") !== (next.get("quartos_plus") ?? "")) return true;
  if ((prev.get("suites_plus") ?? "") !== (next.get("suites_plus") ?? "")) return true;
  if ((prev.get("banheiros_plus") ?? "") !== (next.get("banheiros_plus") ?? "")) return true;
  if ((prev.get("vagas_plus") ?? "") !== (next.get("vagas_plus") ?? "")) return true;
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
    selectedQuartosPlus: params.get("quartos_plus") === "1",
    selectedSuites: getNumberArrayParam(params, "suites"),
    selectedSuitesPlus: params.get("suites_plus") === "1",
    selectedBanheiros: getNumberArrayParam(params, "banheiros"),
    selectedBanheirosPlus: params.get("banheiros_plus") === "1",
    selectedVagas: getNumberArrayParam(params, "vagas"),
    selectedVagasPlus: params.get("vagas_plus") === "1",
    selectedComodidades: getStringArrayParam(params, "comodidade"),
    minPrice: params.get("min") ?? "",
    maxPrice: params.get("max") ?? "",
  };
}

export function AiSearcherClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const modeParam = searchParams.get("mode") as SearchMode | null;
  const searchMode: SearchMode = modeParam === "conventional" ? "conventional" : "ai";

  const [properties, setProperties] = useState<AiSearcherProperty[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiPage, setAiPage] = useState(1);
  const aiPromptRef = useRef("");
  const isAiMode = searchMode === "ai";

  const pageParam = Number(searchParams.get("pagina") ?? "1");
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const effectiveModePage = isAiMode ? aiPage : currentPage;

  async function fetchAiResults(prompt: string, page: number, perPage: number) {
    setAiLoading(true);
    try {
      const response = await api.post(`${API_PREFIX}/scrapy-properties/ai-search`, {
        prompt,
        page,
        per_page: perPage,
      });

      const data: AiSearchResponse = response.data;
      setProperties(data.data);
      setTotalPages(data.meta.last_page);
      setTotalItems(data.meta.total);
    } catch (error) {
      console.error("Erro ao buscar com IA:", error);
    } finally {
      setAiLoading(false);
    }
  }

  useEffect(() => {
    if (!isAiMode) {
      async function fetchProperties() {
        setIsLoading(true);
        try {
          const queryParams = new URLSearchParams(searchParams.toString());
          if (queryParams.has("pagina")) {
            queryParams.set("page", queryParams.get("pagina")!);
            queryParams.delete("pagina");
          }
          if (!queryParams.has("per_page")) {
            const _perPage = queryParams.get("per_page") ?? "20";
            queryParams.set("per_page", _perPage);
          }

          const response = await api.get(`${API_PREFIX}/scrapy-properties?${queryParams.toString()}`);

          const data = response.data.data.map((item: Record<string, unknown> & { [k: string]: unknown }) => ({
            id: item.id,
            image: item.image || "",
            tipo: item.tipo || "",
            preco: Number(item.preco) || 0,
            bairro: item.bairro || "",
            cidade: item.cidade || "",
            imobiliaria: item.imobiliaria || "",
            quartos: item.quartos || 0,
            suites: item.suites || 0,
            banheiros: item.banheiros || 0,
            vagas: item.vagas || 0,
            area: Number(item.area) || 0,
            descricao: item.descricao || "",
            link_imovel: item.link_imovel || "",
            piscina: item.piscina || false,
            churrasqueira: item.churrasqueira || false,
            academia: item.academia || false,
            salao_festas: item.salao_festas || false,
            playground: item.playground || false,
            sacada: item.sacada || false,
            mobiliado: item.mobiliado || false,
            ar_condicionado: item.ar_condicionado || false,
            lavanderia: item.lavanderia || false,
            escritorio: item.escritorio || false,
            closet: item.closet || false,
            elevador: item.elevador || false,
            portaria_24h: item.portaria_24h || false,
            aceita_permuta: item.aceita_permuta || false,
            financiamento: item.financiamento || false,
            andar: item.andar || "",
            posicao_solar: item.posicao_solar || "",
            ano_construcao: item.ano_construcao || 0,
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
    }
  }, [searchParams, isAiMode]);

  const filtersFromUrl = useMemo(
    () => buildFilterStateFromUrl(searchParams),
    [searchParams]
  );

  const sortOrderParam = searchParams.get("ordem");
  const sortOrder =
    sortOrderParam === "asc" || sortOrderParam === "desc"
      ? sortOrderParam
      : "none";

  const perPageParam = Number(searchParams.get("per_page") ?? "20");
  const perPage = [20, 50, 100].includes(perPageParam) ? perPageParam : 20;

  const effectivePage = Math.min(Math.max(effectiveModePage, 1), Math.max(totalPages, 1));

  const pushSearchParams = useCallback(
    (updater: (params: URLSearchParams) => URLSearchParams, replace = false) => {
      const currentParamsStr = searchParams.toString();
      const newParams = updater(new URLSearchParams(currentParamsStr));
      const newParamsStr = newParams.toString();

      if (currentParamsStr === newParamsStr) {
        return;
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

  function handleModeChange(mode: string) {
    if (!mode) return;
    const newMode = mode as SearchMode;
    pushSearchParams((nextParams) => {
      if (newMode === "ai") {
        nextParams.delete("mode");
      } else {
        nextParams.set("mode", "conventional");
      }
      nextParams.delete("pagina");
      return nextParams;
    }, true);
  }

  function handleAiResults(response: AiSearchResponse, prompt: string) {
    setProperties(response.data);
    setTotalPages(response.meta.last_page);
    setTotalItems(response.meta.total);
    setAiPage(1);
    aiPromptRef.current = prompt;
  }

  function handleAiLoadingChange(loading: boolean) {
    setAiLoading(loading);
    if (loading) {
      setIsLoading(false);
    }
  }

  const handleFilterChange = useCallback(() => {
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
        setArrayParam(nextParams, "suites", state.selectedSuites);
        setArrayParam(nextParams, "banheiros", state.selectedBanheiros);
        setArrayParam(nextParams, "vagas", state.selectedVagas);
        setArrayParam(nextParams, "comodidade", state.selectedComodidades);

        if (state.selectedQuartosPlus) {
          nextParams.set("quartos_plus", "1");
        } else {
          nextParams.delete("quartos_plus");
        }

        if (state.selectedSuitesPlus) {
          nextParams.set("suites_plus", "1");
        } else {
          nextParams.delete("suites_plus");
        }

        if (state.selectedBanheirosPlus) {
          nextParams.set("banheiros_plus", "1");
        } else {
          nextParams.delete("banheiros_plus");
        }

        if (state.selectedVagasPlus) {
          nextParams.set("vagas_plus", "1");
        } else {
          nextParams.delete("vagas_plus");
        }

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
      if (isAiMode) return;
      pushSearchParams((_nextParams) => {
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
    [pushSearchParams, searchParams, isAiMode]
  );

  const handlePerPageChange = useCallback(
    (value: string) => {
      if (isAiMode) {
        const newPerPage = Number(value);
        fetchAiResults(aiPromptRef.current, 1, newPerPage);
        return;
      }
      pushSearchParams((_nextParams) => {
        const current = new URLSearchParams(searchParams.toString());
        const result = new URLSearchParams(current.toString());
        result.set("per_page", value);
        result.delete("pagina");
        return result;
      });
    },
    [pushSearchParams, searchParams, isAiMode]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (isAiMode) {
        setAiPage(page);
        fetchAiResults(aiPromptRef.current, page, perPage);
      } else {
        pushSearchParams((_nextParams) => {
          const result = new URLSearchParams(searchParams.toString());
          if (page <= 1) {
            result.delete("pagina");
          } else {
            result.set("pagina", String(page));
          }
          return result;
        });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [pushSearchParams, searchParams, isAiMode, perPage]
  );

  useEffect(() => {
    if (!isAiMode) {
      if (totalPages === 0 && currentPage !== 1) {
        pushSearchParams((_params) => {
          const result = new URLSearchParams(searchParams.toString());
          result.delete("pagina");
          return result;
        }, true);
        return;
      }

      if (totalPages > 0 && currentPage !== effectivePage) {
        pushSearchParams((_params) => {
          const result = new URLSearchParams(searchParams.toString());
          if (effectivePage <= 1) {
            result.delete("pagina");
          } else {
            result.set("pagina", String(effectivePage));
          }
          return result;
        }, true);
      }
    }
  }, [currentPage, effectivePage, pushSearchParams, searchParams, totalPages, isAiMode]);

  const isLoadingEffective = isAiMode ? aiLoading && properties.length === 0 : isLoading;

  if (isLoadingEffective) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Modo de busca:</span>
          <ToggleGroup
            type="single"
            value={searchMode}
            onValueChange={handleModeChange}
            className="border rounded-md"
          >
            <ToggleGroupItem value="ai" aria-label="Busca por IA" className="cursor-pointer gap-1.5 px-4">
              <Sparkles className="h-3.5 w-3.5" />
              IA
            </ToggleGroupItem>
            <ToggleGroupItem value="conventional" aria-label="Busca Convencional" className="cursor-pointer gap-1.5 px-4">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground animate-pulse">Carregando imóveis da base de dados...</p>
        </div>
      </div>
    );
  }

  if (isAiMode && properties.length === 0 && !aiLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Modo de busca:</span>
          <ToggleGroup
            type="single"
            value={searchMode}
            onValueChange={handleModeChange}
            className="border rounded-md"
          >
            <ToggleGroupItem value="ai" aria-label="Busca por IA" className="cursor-pointer gap-1.5 px-4">
              <Sparkles className="h-3.5 w-3.5" />
              IA
            </ToggleGroupItem>
            <ToggleGroupItem value="conventional" aria-label="Busca Convencional" className="cursor-pointer gap-1.5 px-4">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <AiPromptInput
            onResults={handleAiResults}
            onLoadingChange={handleAiLoadingChange}
            isLoading={aiLoading}
            large
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-muted-foreground">Modo de busca:</span>
        <ToggleGroup
          type="single"
          value={searchMode}
          onValueChange={handleModeChange}
          className="border rounded-md"
        >
          <ToggleGroupItem value="ai" aria-label="Busca por IA" className="cursor-pointer gap-1.5 px-4">
            <Sparkles className="h-3.5 w-3.5" />
            IA
          </ToggleGroupItem>
          <ToggleGroupItem value="conventional" aria-label="Busca Convencional" className="cursor-pointer gap-1.5 px-4">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filtros
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {!isAiMode && (
          <aside
            className="lg:w-80 shrink-0"
          >
            <PropertyFilters
              properties={properties}
              onFilterChange={handleFilterChange}
              initialState={filtersFromUrl}
              onFilterStateChange={handleFilterStateChange}
            />
          </aside>
        )}

        <main className="flex-1 min-w-0">
          {isAiMode && (
            <div className="mb-6">
              <AiPromptInput
                onResults={handleAiResults}
                onLoadingChange={handleAiLoadingChange}
                isLoading={aiLoading}
              />
            </div>
          )}
          {!isAiMode && (
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

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="sort-select"
                    className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer"
                  >
                    Ordenar por:
                  </label>
                  <Select value={sortOrder} onValueChange={handleSortChange}>
                    <SelectTrigger id="sort-select" className="w-[200px] cursor-pointer">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="cursor-pointer">Padrão</SelectItem>
                      <SelectItem value="asc" className="cursor-pointer">Menor valor</SelectItem>
                      <SelectItem value="desc" className="cursor-pointer">Maior valor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="per-page-select"
                    className="text-sm text-muted-foreground whitespace-nowrap cursor-pointer"
                  >
                    Itens por página:
                  </label>
                  <Select value={String(perPage)} onValueChange={handlePerPageChange}>
                    <SelectTrigger id="per-page-select" className="w-[90px] cursor-pointer">
                      <SelectValue placeholder="20" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20" className="cursor-pointer">20</SelectItem>
                      <SelectItem value="50" className="cursor-pointer">50</SelectItem>
                      <SelectItem value="100" className="cursor-pointer">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {isAiMode && (
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground">
                Imóveis Disponíveis
              </h2>
              {totalItems > 0 && (
                <p className="text-muted-foreground mt-1">
                  {totalItems}{" "}
                  {totalItems === 1
                    ? "imóvel encontrado"
                    : "imóveis encontrados"}
                  {totalPages > 1 &&
                    ` — Página ${effectivePage} de ${totalPages}`}
                </p>
              )}
            </div>
          )}

          <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>

          {properties.length === 0 && !aiLoading && (
            <div className="text-center py-16">
              <p className="text-xl text-muted-foreground">
                {isAiMode
                  ? "Nenhum imóvel encontrado. Tente descrever sua busca com outros termos."
                  : "Nenhum imóvel encontrado com os filtros selecionados."}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <Button
                onClick={() => handlePageChange(effectivePage - 1)}
                disabled={effectivePage === 1}
                variant="outline"
                className="flex items-center gap-1 cursor-pointer"
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
                          className="min-w-[40px] cursor-pointer"
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
                className="flex items-center gap-1 cursor-pointer"
              >
                Próxima
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
