"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  CircleAlert,
  Loader2,
  SearchX,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  DEFAULT_PAGE_SIZE,
  PaginationFooter,
} from "@/components/layout/PaginationFooter";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PropertyCard, PropertyCardSkeleton } from "./PropertyCard";
import { PropertyFilters } from "./PropertyFilters";
import { AiPromptInput } from "./AiPromptInput";
import {
  getMarketSearchErrorMessage,
  isMarketSearchAllowanceExceeded,
} from "./marketSearchError";
import {
  type AiSearcherProperty,
  type AiSearcherFiltersState,
  type SearchMode,
  type AiSearchResponse,
  type SortMode,
} from "./types";
import api, { API_PREFIX } from "@/services/api";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "area_desc", label: "Maior área" },
  { value: "area_asc", label: "Menor área" },
];

const PROPERTY_GRID_CLASS =
  "grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3 @5xl:grid-cols-4";

const RELAXED_FILTER_LABELS: Record<string, string> = {
  "comodidades.academia": "academia",
  "comodidades.salao_festas": "salão de festas",
  "comodidades.playground": "playground",
  "comodidades.sacada": "sacada",
  "comodidades.mobiliado": "mobiliado",
  "comodidades.lavanderia": "lavanderia",
  "comodidades.closet": "closet",
  min: "valor mínimo",
  max: "valor máximo",
  quartos_plus: "quartos 4+",
  suites_plus: "suítes 4+",
  banheiros_plus: "banheiros 4+",
  vagas_plus: "vagas 4+",
  bairro: "bairro",
  bairro_fuzzy: "bairro",
  locations: "bairros próximos",
  proximity: "proximidade",
};

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
  if ((prev.get("descricao") ?? "") !== (next.get("descricao") ?? "")) return true;
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
    descricao: params.get("descricao") ?? "",
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
  const [searchError, setSearchError] = useState<string | null>(null);
  const [allowanceExhausted, setAllowanceExhausted] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiPage, setAiPage] = useState(1);
  const [aiApproximate, setAiApproximate] = useState(false);
  const [aiRelaxedFilters, setAiRelaxedFilters] = useState<string[]>([]);
  const aiPromptRef = useRef("");
  const aiFiltersRef = useRef<Record<string, unknown> | null>(null);
  const aiApproximateRef = useRef(false);
  const aiRelaxedFiltersRef = useRef<string[]>([]);
  const isAiMode = searchMode === "ai";

  const pageParam = Number(searchParams.get("pagina") ?? "1");
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const effectiveModePage = isAiMode ? aiPage : currentPage;

  const sortOrderParam = searchParams.get("sort");
  const legacySortOrderParam = searchParams.get("ordem");
  const sortOrder: SortMode =
    sortOrderParam === "price_asc" ||
    sortOrderParam === "price_desc" ||
    sortOrderParam === "area_asc" ||
    sortOrderParam === "area_desc" ||
    sortOrderParam === "newest"
      ? sortOrderParam
      : legacySortOrderParam === "asc"
        ? "price_asc"
        : legacySortOrderParam === "desc"
          ? "price_desc"
          : "newest";

  const fetchAiResults = useCallback(async (prompt: string, page: number, perPage: number, sort: SortMode = sortOrder) => {
    if (!prompt.trim() || allowanceExhausted) return;

    setAiLoading(true);
    setSearchError(null);
    try {
      const payload: {
        prompt: string;
        page: number;
        per_page: number;
        sort: SortMode;
        filters?: Record<string, unknown>;
      } = {
        prompt,
        page,
        per_page: perPage,
        sort,
      };

      if (aiFiltersRef.current) {
        payload.filters = aiFiltersRef.current;
      }

      const response = await api.post(`${API_PREFIX}/market-properties/ai-search`, payload);

      const data: AiSearchResponse = response.data;
      const keepsApproximation = Boolean(payload.filters) && aiApproximateRef.current;
      const approximate = Boolean(data.meta.approximate) || keepsApproximation;
      const relaxedFilters =
        data.meta.relaxed && data.meta.relaxed.length > 0
          ? data.meta.relaxed
          : keepsApproximation
            ? aiRelaxedFiltersRef.current
            : [];

      setProperties(data.data);
      setTotalPages(data.meta.last_page);
      setTotalItems(data.meta.total);
      setAiApproximate(approximate);
      setAiRelaxedFilters(relaxedFilters);
      aiFiltersRef.current = data.filters;
      aiApproximateRef.current = approximate;
      aiRelaxedFiltersRef.current = relaxedFilters;
    } catch (error: unknown) {
      setSearchError(getMarketSearchErrorMessage(error));
      if (isMarketSearchAllowanceExceeded(error)) {
        setAllowanceExhausted(true);
      }
    } finally {
      setAiLoading(false);
    }
  }, [allowanceExhausted, sortOrder]);

  useEffect(() => {
    if (!isAiMode && !allowanceExhausted) {
      async function fetchProperties() {
        setIsLoading(true);
        try {
          const queryParams = new URLSearchParams(searchParams.toString());
          if (queryParams.has("pagina")) {
            queryParams.set("page", queryParams.get("pagina")!);
            queryParams.delete("pagina");
          }
          queryParams.set("per_page", String(DEFAULT_PAGE_SIZE));

          const response = await api.get(`${API_PREFIX}/market-properties?${queryParams.toString()}`);

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
          setSearchError(null);
        } catch (error: unknown) {
          setSearchError(getMarketSearchErrorMessage(error));
          if (isMarketSearchAllowanceExceeded(error)) {
            setAllowanceExhausted(true);
          }
        } finally {
          setIsLoading(false);
        }
      }
      fetchProperties();
    }
  }, [allowanceExhausted, searchParams, isAiMode]);

  const filtersFromUrl = useMemo(
    () => buildFilterStateFromUrl(searchParams),
    [searchParams]
  );

  const perPage = DEFAULT_PAGE_SIZE;

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
    if (!allowanceExhausted) setSearchError(null);
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
    setSearchError(null);
    setAllowanceExhausted(false);
    setProperties(response.data);
    setTotalPages(response.meta.last_page);
    setTotalItems(response.meta.total);
    setAiApproximate(Boolean(response.meta.approximate));
    setAiRelaxedFilters(response.meta.relaxed ?? []);
    setAiPage(1);
    aiPromptRef.current = prompt;
    aiFiltersRef.current = response.filters;
    aiApproximateRef.current = Boolean(response.meta.approximate);
    aiRelaxedFiltersRef.current = response.meta.relaxed ?? [];
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

        if (state.descricao) {
          nextParams.set("descricao", state.descricao);
        } else {
          nextParams.delete("descricao");
        }

        const sort = prev.get("sort");
        if (sort) nextParams.set("sort", sort);

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
      const nextSort = value as SortMode;

      pushSearchParams(() => {
        const current = new URLSearchParams(searchParams.toString());
        const result = new URLSearchParams(current.toString());

        result.delete("ordem");
        if (nextSort === "newest") {
          result.delete("sort");
        } else {
          result.set("sort", nextSort);
        }
        result.delete("pagina");
        return result;
      });

      if (isAiMode && aiPromptRef.current) {
        setAiPage(1);
        fetchAiResults(aiPromptRef.current, 1, perPage, nextSort);
      }
    },
    [fetchAiResults, pushSearchParams, searchParams, isAiMode, perPage]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      if (isAiMode) {
        setAiPage(page);
        fetchAiResults(aiPromptRef.current, page, perPage, sortOrder);
      } else {
        pushSearchParams(() => {
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
    [fetchAiResults, pushSearchParams, searchParams, isAiMode, perPage, sortOrder]
  );

  useEffect(() => {
    if (!isAiMode) {
      if (totalPages === 0 && currentPage !== 1) {
        pushSearchParams(() => {
          const result = new URLSearchParams(searchParams.toString());
          result.delete("pagina");
          return result;
        }, true);
        return;
      }

      if (totalPages > 0 && currentPage !== effectivePage) {
        pushSearchParams(() => {
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

  function handleAllowanceExhausted(message: string) {
    setSearchError(message);
    setAllowanceExhausted(true);
  }

  const pageHeader = (
    <PageHeader
      title="Buscador com IA"
      description={
        isAiMode
          ? "Descreva o imóvel em linguagem natural e a IA monta a busca na base de mercado."
          : "Filtre os imóveis da base de mercado por localização, cômodos, preço e comodidades."
      }
      actions={
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Modo de busca
          </span>
          <ToggleGroup
            type="single"
            value={searchMode}
            onValueChange={handleModeChange}
            role="radiogroup"
            aria-label="Modo de busca"
            className="rounded-lg p-1"
          >
            <ToggleGroupItem
              value="ai"
              aria-label="Busca por IA"
              className="h-8 cursor-pointer gap-1.5 rounded-md px-3"
            >
              <Sparkles className="size-3.5" />
              IA
            </ToggleGroupItem>
            <ToggleGroupItem
              value="conventional"
              aria-label="Busca Convencional"
              className="h-8 cursor-pointer gap-1.5 rounded-md px-3"
            >
              <SlidersHorizontal className="size-3.5" />
              Filtros
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      }
    />
  );

  if (isLoadingEffective) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <div
          className={
            isAiMode
              ? undefined
              : "grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]"
          }
        >
          {!isAiMode && (
            <Skeleton className="hidden h-[36rem] rounded-xl lg:block" />
          )}
          <div className="@container min-w-0 space-y-4">
            <p
              role="status"
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Loader2 className="size-4 animate-spin" />
              {isAiMode
                ? "Buscando imóveis com IA..."
                : "Carregando imóveis da base de dados..."}
            </p>
            <div className={PROPERTY_GRID_CLASS}>
              {Array.from({ length: 8 }, (_, index) => (
                <PropertyCardSkeleton key={index} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAiMode && properties.length === 0 && !aiLoading) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <AiPromptInput
          onResults={handleAiResults}
          onLoadingChange={handleAiLoadingChange}
          isLoading={aiLoading}
          sort={sortOrder}
          large
          disabled={allowanceExhausted}
          onAllowanceExhausted={handleAllowanceExhausted}
        />
      </div>
    );
  }

  const sortSelectId = isAiMode ? "ai-sort-select" : "sort-select";

  const results = (
    <section aria-label="Resultados da busca" className="@container min-w-0 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="text-base text-foreground">Imóveis Disponíveis</h2>
          {(!isAiMode || totalItems > 0) && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {totalItems}{" "}
              {totalItems === 1 ? "imóvel encontrado" : "imóveis encontrados"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor={sortSelectId}
            className="cursor-pointer text-sm whitespace-nowrap text-muted-foreground"
          >
            Ordenar por
          </label>
          <Select
            value={sortOrder}
            onValueChange={handleSortChange}
            disabled={allowanceExhausted}
          >
            <SelectTrigger id={sortSelectId} size="sm" className="w-44 cursor-pointer">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isAiMode && aiApproximate && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
          <p>
            Mostrando resultados aproximados
            {aiRelaxedFilters.length > 0 && (
              <>
                {" — filtros relaxados: "}
                {aiRelaxedFilters
                  .map((filter) => RELAXED_FILTER_LABELS[filter] ?? filter)
                  .join(", ")}
              </>
            )}
          </p>
        </div>
      )}

      {searchError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{searchError}</p>
        </div>
      )}

      {properties.length > 0 && (
        <div className={PROPERTY_GRID_CLASS}>
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {properties.length === 0 && !aiLoading && (
        <EmptyState
          icon={SearchX}
          title="Nenhum imóvel encontrado"
          description={
            isAiMode
              ? "Tente descrever sua busca com outros termos."
              : "Nenhum imóvel corresponde aos filtros selecionados. Ajuste ou limpe os filtros."
          }
        />
      )}

      {properties.length > 0 && (
        <fieldset disabled={allowanceExhausted} className="min-w-0">
          <PaginationFooter
            page={effectivePage}
            pageCount={totalPages}
            onPageChange={handlePageChange}
            total={totalItems}
            pageSize={perPage}
            itemLabel="imóveis"
            className="px-0 pt-4 sm:px-0"
          />
        </fieldset>
      )}
    </section>
  );

  if (isAiMode) {
    return (
      <div className="space-y-6">
        {pageHeader}
        <AiPromptInput
          onResults={handleAiResults}
          onLoadingChange={handleAiLoadingChange}
          isLoading={aiLoading}
          sort={sortOrder}
          disabled={allowanceExhausted}
          onAllowanceExhausted={handleAllowanceExhausted}
        />
        {results}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {pageHeader}
      <div className="grid items-start gap-6 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <fieldset
          disabled={allowanceExhausted}
          className="min-w-0 lg:sticky lg:top-0"
        >
          <PropertyFilters
            properties={properties}
            onFilterChange={handleFilterChange}
            initialState={filtersFromUrl}
            onFilterStateChange={handleFilterStateChange}
          />
        </fieldset>
        {results}
      </div>
    </div>
  );
}
