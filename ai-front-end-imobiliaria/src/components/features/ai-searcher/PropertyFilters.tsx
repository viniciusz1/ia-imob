"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  Save,
  Pencil,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import type {
  AiSearcherProperty,
  AiSearcherFiltersState,
  AiSearcherFiltersOptions,
  SavedFilter,
} from "./types";
import api, { API_PREFIX } from "@/services/api";
import {
  getMarketPropertyFilters,
  type MarketPropertyFiltersQuery,
} from "@/services/marketPropertyService";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";


interface PropertyFiltersProps {
  properties: AiSearcherProperty[];
  onFilterChange: (filtered: AiSearcherProperty[]) => void;
  initialState: AiSearcherFiltersState;
  onFilterStateChange: (state: AiSearcherFiltersState) => void;
}

const FIXED_ROOM_OPTIONS = [1, 2, 3, 4];

type FilterView =
  | "overview"
  | "cidade"
  | "bairro"
  | "tipo"
  | "imobiliaria"
  | "rooms"
  | "more";

const FILTER_VIEW_TITLES: Record<Exclude<FilterView, "overview">, string> = {
  cidade: "Cidade",
  bairro: "Bairro",
  tipo: "Tipo do imóvel",
  imobiliaria: "Imobiliária",
  rooms: "Quartos e vagas",
  more: "Mais filtros",
};

const COMODIDADE_LABELS: Record<string, string> = {
  piscina: "Piscina",
  churrasqueira: "Churrasqueira",
  academia: "Academia",
  salao_festas: "Salão de Festas",
  playground: "Playground",
  sacada: "Sacada",
  mobiliado: "Mobiliado",
  ar_condicionado: "Ar Condicionado",
  lavanderia: "Lavanderia",
  escritorio: "Escritório",
  closet: "Closet",
  elevador: "Elevador",
  portaria_24h: "Portaria 24h",
  aceita_permuta: "Aceita Permuta",
  financiamento: "Financiamento",
};

const COMODIDADE_GROUPS: { title: string; keys: string[] }[] = [
  {
    title: "Infraestrutura",
    keys: ["piscina", "churrasqueira", "academia", "salao_festas", "playground"],
  },
  {
    title: "Conveniência",
    keys: ["elevador", "portaria_24h", "mobiliado", "ar_condicionado", "lavanderia", "sacada"],
  },
  {
    title: "Comércio",
    keys: ["aceita_permuta", "financiamento"],
  },
  {
    title: "Outros",
    keys: ["escritorio", "closet"],
  },
];

const EMPTY_FILTER_STATE: AiSearcherFiltersState = {
  selectedTipos: [],
  selectedBairros: [],
  selectedCidades: [],
  selectedImobiliarias: [],
  selectedQuartos: [],
  selectedQuartosPlus: false,
  selectedSuites: [],
  selectedSuitesPlus: false,
  selectedBanheiros: [],
  selectedBanheirosPlus: false,
  selectedVagas: [],
  selectedVagasPlus: false,
  selectedComodidades: [],
  descricao: "",
  minPrice: "",
  maxPrice: "",
};

function summarizeItems(items: string[], emptyLabel: string) {
  if (items.length === 0) return emptyLabel;
  if (items.length <= 2) return items.join(", ");
  return `${items.slice(0, 2).join(", ")} +${items.length - 2}`;
}

function summarizeRoomSelection(
  items: number[],
  plusSelected: boolean,
  singularLabel: string
) {
  const selectedValues = items.map(String);
  if (plusSelected) selectedValues.push("4+");
  if (selectedValues.length === 0) return null;

  const label = selectedValues.length === 1 ? singularLabel : `${singularLabel}s`;
  return `${selectedValues.join(", ")} ${label}`;
}

function buildFiltersQuery(
  state: AiSearcherFiltersState
): MarketPropertyFiltersQuery | undefined {
  const query: MarketPropertyFiltersQuery = {};

  if (state.selectedTipos.length > 0) query.tipo = state.selectedTipos;
  if (state.selectedBairros.length > 0) query.bairro = state.selectedBairros;
  if (state.selectedCidades.length > 0) query.cidade = state.selectedCidades;
  if (state.selectedImobiliarias.length > 0) query.imobiliaria = state.selectedImobiliarias;
  if (state.selectedQuartos.length > 0) query.quartos = state.selectedQuartos;
  if (state.selectedQuartosPlus) query.quartos_plus = true;
  if (state.selectedSuites.length > 0) query.suites = state.selectedSuites;
  if (state.selectedSuitesPlus) query.suites_plus = true;
  if (state.selectedBanheiros.length > 0) query.banheiros = state.selectedBanheiros;
  if (state.selectedBanheirosPlus) query.banheiros_plus = true;
  if (state.selectedVagas.length > 0) query.vagas = state.selectedVagas;
  if (state.selectedVagasPlus) query.vagas_plus = true;
  if (state.selectedComodidades.length > 0) query.comodidade = state.selectedComodidades;
  if (state.minPrice) query.min = state.minPrice;
  if (state.maxPrice) query.max = state.maxPrice;
  if (state.descricao.trim()) query.descricao = state.descricao.trim();

  return Object.keys(query).length > 0 ? query : undefined;
}

function pruneStateWithOptions(
  current: AiSearcherFiltersState,
  options: AiSearcherFiltersOptions
): AiSearcherFiltersState {
  const selectedCidades =
    options.cidades.length > 0
      ? current.selectedCidades.filter((c) => options.cidades.includes(c))
      : current.selectedCidades;

  const validBairros =
    selectedCidades.length === 0 || Object.keys(options.bairros_por_cidade).length === 0
      ? options.bairros
      : selectedCidades.flatMap((cidade) => options.bairros_por_cidade[cidade] ?? []);

  const selectedBairros = current.selectedBairros.filter((b) =>
    validBairros.includes(b)
  );
  const selectedTipos =
    options.tipos.length > 0 || options.comodidades !== undefined
      ? current.selectedTipos.filter((t) => options.tipos.includes(t))
      : current.selectedTipos;
  const selectedImobiliarias = current.selectedImobiliarias.filter((i) =>
    options.imobiliarias.includes(i)
  );

  const hasDynamicCounts = options.comodidades !== undefined;

  const selectedQuartos =
    hasDynamicCounts || options.quartos.length > 0
      ? current.selectedQuartos.filter((q) => options.quartos.includes(q))
      : current.selectedQuartos;
  const selectedQuartosPlus =
    hasDynamicCounts || options.quartos.length > 0
      ? current.selectedQuartosPlus && options.quartos.some((q) => q >= 4)
      : current.selectedQuartosPlus;

  const selectedSuites =
    hasDynamicCounts || options.suites.length > 0
      ? current.selectedSuites.filter((s) => options.suites.includes(s))
      : current.selectedSuites;
  const selectedSuitesPlus =
    hasDynamicCounts || options.suites.length > 0
      ? current.selectedSuitesPlus && options.suites.some((s) => s >= 4)
      : current.selectedSuitesPlus;

  const selectedBanheiros =
    hasDynamicCounts || options.banheiros.length > 0
      ? current.selectedBanheiros.filter((b) => options.banheiros.includes(b))
      : current.selectedBanheiros;
  const selectedBanheirosPlus =
    hasDynamicCounts || options.banheiros.length > 0
      ? current.selectedBanheirosPlus && options.banheiros.some((b) => b >= 4)
      : current.selectedBanheirosPlus;

  const selectedVagas =
    hasDynamicCounts || options.vagas.length > 0
      ? current.selectedVagas.filter((v) => options.vagas.includes(v))
      : current.selectedVagas;
  const selectedVagasPlus =
    hasDynamicCounts || options.vagas.length > 0
      ? current.selectedVagasPlus && options.vagas.some((v) => v >= 4)
      : current.selectedVagasPlus;

  const selectedComodidades =
    options.comodidades !== undefined
      ? current.selectedComodidades.filter((c) => options.comodidades?.includes(c))
      : current.selectedComodidades;

  const next: AiSearcherFiltersState = {
    ...current,
    selectedCidades,
    selectedBairros,
    selectedTipos,
    selectedImobiliarias,
    selectedQuartos,
    selectedQuartosPlus,
    selectedSuites,
    selectedSuitesPlus,
    selectedBanheiros,
    selectedBanheirosPlus,
    selectedVagas,
    selectedVagasPlus,
    selectedComodidades,
  };

  return JSON.stringify(next) === JSON.stringify(current) ? current : next;
}

export function PropertyFilters(
  props: PropertyFiltersProps
) {
  const {
    initialState,
    onFilterStateChange,
  } = props;
  const [filterState, setFilterState] = useState<AiSearcherFiltersState>(initialState);
  const [filterOptions, setFilterOptions] = useState<AiSearcherFiltersOptions>({
    tipos: [],
    bairros: [],
    bairros_por_cidade: {},
    cidades: [],
    imobiliarias: [],
    quartos: [],
    suites: [],
    banheiros: [],
    vagas: [],
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [savedFiltersLoading, setSavedFiltersLoading] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  const [searchTipo, setSearchTipo] = useState<string>("");
  const [searchBairro, setSearchBairro] = useState<string>("");
  const [searchCidade, setSearchCidade] = useState<string>("");
  const [searchImobiliaria, setSearchImobiliaria] = useState<string>("");
  const [activeView, setActiveView] = useState<FilterView>("overview");

  const isCommittingRef = useRef(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const filterStateKey = JSON.stringify(filterState);
  // Typing a price changes the state on every keystroke; the available
  // options are only requested again once the user pauses.
  const optionsRequestKey = useDebouncedValue(filterStateKey);

  useEffect(() => {
    let active = true;
    const query = buildFiltersQuery(JSON.parse(optionsRequestKey) as typeof filterState);

    getMarketPropertyFilters(query)
      .then((filters) => {
        if (!active) return;
        setFilterOptions(filters);
        setFilterState((prev) => pruneStateWithOptions(prev, filters));
      })
      .catch(console.error);

    return () => {
      active = false;
    };
  }, [optionsRequestKey]);

  useEffect(() => {
    setSavedFiltersLoading(true);
    api
      .get(`${API_PREFIX}/saved-filters`)
      .then((res) => setSavedFilters(res.data))
      .catch(() => toast.error("Erro ao carregar filtros salvos."))
      .finally(() => setSavedFiltersLoading(false));
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [activeView]);

  const initialStateKey = useMemo(
    () => JSON.stringify(initialState),
    [initialState]
  );

  useEffect(() => {
    if (isCommittingRef.current) return;
    if (initialStateKey !== filterStateKey) {
      setFilterState(initialState);
      setActiveFilterId(null);
      setActiveView("overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStateKey]);

  const {
    tipos,
    bairros,
    bairros_por_cidade: bairrosPorCidade,
    cidades,
    imobiliarias,
    quartos: availableQuartos,
    suites: availableSuites,
    banheiros: availableBanheiros,
    vagas: availableVagas,
    comodidades: availableComodidades,
  } = filterOptions;
  const hasDynamicFacets = availableComodidades !== undefined;

  const bairrosDisponiveis = useMemo(() => {
    if (filterState.selectedCidades.length === 0 || Object.keys(bairrosPorCidade).length === 0) {
      return bairros;
    }

    return [...new Set(
      filterState.selectedCidades.flatMap((cidade) => bairrosPorCidade[cidade] ?? [])
    )].sort((left, right) => left.localeCompare(right, "pt-BR"));
  }, [bairros, bairrosPorCidade, filterState.selectedCidades]);

  const filteredTipos = tipos.filter((t) =>
    t.toLowerCase().includes(searchTipo.toLowerCase())
  );
  const filteredBairros = bairrosDisponiveis.filter((b) =>
    b.toLowerCase().includes(searchBairro.toLowerCase())
  );
  const filteredCidades = cidades.filter((c) =>
    c.toLowerCase().includes(searchCidade.toLowerCase())
  );
  const filteredImobiliarias = imobiliarias.filter((i) =>
    i.toLowerCase().includes(searchImobiliaria.toLowerCase())
  );

  const handleToggle = useCallback(
    <T extends string | number>(
      key: keyof AiSearcherFiltersState,
      value: T,
      checked: boolean
    ) => {
      setFilterState((prev) => ({
        ...prev,
        [key]: checked
          ? [...(prev[key] as T[]), value]
          : (prev[key] as T[]).filter((v) => v !== value),
      }));
    },
    []
  );

  const handleBoolToggle = useCallback(
    (key: keyof AiSearcherFiltersState) => {
      setFilterState((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  const updateSelectedCidades = useCallback(
    (getNextCidades: (current: string[]) => string[]) => {
      setFilterState((prev) => {
        const selectedCidades = getNextCidades(prev.selectedCidades);
        const bairrosValidos = selectedCidades.length === 0 || Object.keys(bairrosPorCidade).length === 0
          ? bairros
          : selectedCidades.flatMap((cidade) => bairrosPorCidade[cidade] ?? []);

        return {
          ...prev,
          selectedCidades,
          selectedBairros: prev.selectedBairros.filter((bairro) => bairrosValidos.includes(bairro)),
        };
      });
    },
    [bairros, bairrosPorCidade]
  );

  const commitFilterState = useCallback(
    (state: AiSearcherFiltersState) => {
      isCommittingRef.current = true;
      onFilterStateChange(state);
      setTimeout(() => {
        isCommittingRef.current = false;
      }, 500);
    },
    [onFilterStateChange]
  );

  const applyFilters = useCallback(() => {
    commitFilterState(filterState);
    setActiveView("overview");
  }, [filterState, commitFilterState]);

  const clearFilters = useCallback(() => {
    setFilterState(EMPTY_FILTER_STATE);
    setSearchTipo("");
    setSearchBairro("");
    setSearchCidade("");
    setSearchImobiliaria("");
    setActiveFilterId(null);
    setActiveView("overview");
    commitFilterState(EMPTY_FILTER_STATE);
  }, [commitFilterState]);

  const handlePriceChange = useCallback(
    (value: string, key: "minPrice" | "maxPrice") => {
      const numericStr = value.replace(/\D/g, "");
      setFilterState((prev) => ({ ...prev, [key]: numericStr }));
    },
    []
  );

  const formatToBRL = (value: string) => {
    if (!value) return "";
    const num = parseInt(value, 10);
    if (isNaN(num)) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleSelectFilter = useCallback(
    (id: string) => {
      const saved = savedFilters.find((f) => f.id === id);
      if (saved) {
        setFilterState(saved.filters);
        setActiveFilterId(id);
        commitFilterState(saved.filters);
        setSearchTipo("");
        setSearchBairro("");
        setSearchCidade("");
        setSearchImobiliaria("");
        setActiveView("overview");
      }
    },
    [savedFilters, commitFilterState]
  );

  const handleSaveNewFilter = useCallback(() => {
    const trimmed = newFilterName.trim();
    if (!trimmed) return;

    api
      .post(`${API_PREFIX}/saved-filters`, {
        name: trimmed,
        filters: filterState,
      })
      .then((res) => {
        setSavedFilters((prev) => [res.data, ...prev]);
        setActiveFilterId(res.data.id);
        setSaveDialogOpen(false);
        setNewFilterName("");
        toast.success(`Filtro "${trimmed}" salvo com sucesso.`);
      })
      .catch(() => toast.error("Erro ao salvar filtro."));
  }, [newFilterName, filterState]);

  const handleUpdateFilter = useCallback(() => {
    if (!activeFilterId) return;

    api
      .put(`${API_PREFIX}/saved-filters/${activeFilterId}`, {
        filters: filterState,
      })
      .then((res) => {
        setSavedFilters((prev) =>
          prev.map((f) => (f.id === activeFilterId ? res.data : f))
        );
        const target = savedFilters.find((f) => f.id === activeFilterId);
        const name = target?.name ?? "Filtro";
        toast.success(`Filtro "${name}" atualizado.`);
      })
      .catch(() => toast.error("Erro ao atualizar filtro."));
  }, [activeFilterId, filterState, savedFilters]);

  const handleDeleteFilter = useCallback(() => {
    if (!activeFilterId) return;

    const target = savedFilters.find((f) => f.id === activeFilterId);
    const name = target?.name ?? "Filtro";

    api
      .delete(`${API_PREFIX}/saved-filters/${activeFilterId}`)
      .then(() => {
        setSavedFilters((prev) => prev.filter((f) => f.id !== activeFilterId));
        setActiveFilterId(null);
        toast.success(`Filtro "${name}" excluído.`);
      })
      .catch(() => toast.error("Erro ao excluir filtro."));
  }, [activeFilterId, savedFilters]);

  const hasActiveFilter = activeFilterId !== null;

  const {
    selectedTipos,
    selectedBairros,
    selectedCidades,
    selectedImobiliarias,
    selectedQuartos,
    selectedQuartosPlus,
    selectedSuites,
    selectedSuitesPlus,
    selectedBanheiros,
    selectedBanheirosPlus,
    selectedVagas,
    selectedVagasPlus,
    selectedComodidades,
    descricao,
    minPrice,
    maxPrice,
  } = filterState;

  const activeFilterCount = [
    selectedTipos.length,
    selectedBairros.length,
    selectedCidades.length,
    selectedImobiliarias.length,
    selectedQuartos.length + (selectedQuartosPlus ? 1 : 0),
    selectedSuites.length + (selectedSuitesPlus ? 1 : 0),
    selectedBanheiros.length + (selectedBanheirosPlus ? 1 : 0),
    selectedVagas.length + (selectedVagasPlus ? 1 : 0),
    selectedComodidades.length,
    descricao ? 1 : 0,
    minPrice ? 1 : 0,
    maxPrice ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const roomSummaryParts = [
    summarizeRoomSelection(selectedQuartos, selectedQuartosPlus, "quarto"),
    summarizeRoomSelection(selectedVagas, selectedVagasPlus, "vaga"),
  ].filter((summary): summary is string => summary !== null);

  const roomFilterCount =
    selectedQuartos.length +
    (selectedQuartosPlus ? 1 : 0) +
    selectedVagas.length +
    (selectedVagasPlus ? 1 : 0);

  const moreFilterCount =
    selectedSuites.length +
    (selectedSuitesPlus ? 1 : 0) +
    selectedBanheiros.length +
    (selectedBanheirosPlus ? 1 : 0) +
    selectedComodidades.length +
    (descricao ? 1 : 0);

  const activeViewTitle =
    activeView === "overview" ? null : FILTER_VIEW_TITLES[activeView];


  return (
    <>
      <Card
        data-testid="property-filter-panel"
        className="h-[calc(100vh-6rem)] w-full min-w-0 gap-0 overflow-hidden py-0"
      >
        {activeView === "overview" ? (
          <>
            <SectionHeader
              title={
                <span className="flex items-center gap-2">
                  Filtros
                  {activeFilterCount > 0 && (
                    <Badge className="px-2 tabular-nums">{activeFilterCount}</Badge>
                  )}
                </span>
              }
              icon={SlidersHorizontal}
              actions={
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearFilters}
                  className="text-primary hover:text-primary"
                >
                  Limpar
                </Button>
              }
            />

            {/* Filtros salvos */}
            <div className="flex items-center gap-2 border-b px-6 py-3 sm:px-8">
              <Select
                value={activeFilterId ?? ""}
                onValueChange={handleSelectFilter}
              >
                <SelectTrigger
                  size="sm"
                  aria-label="Filtros salvos"
                  className="min-w-0 flex-1 cursor-pointer"
                >
                  <SelectValue placeholder="Filtros salvos..." />
                </SelectTrigger>
                <SelectContent>
                  {savedFiltersLoading ? (
                    <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Carregando...
                    </div>
                  ) : savedFilters.length === 0 ? (
                    <div className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Nenhum filtro salvo
                    </div>
                  ) : (
                    savedFilters.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="cursor-pointer">
                        {f.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setSaveDialogOpen(true)}
                title="Salvar filtro atual"
                aria-label="Salvar filtro atual"
              >
                <Save />
              </Button>

              {hasActiveFilter && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleUpdateFilter}
                    title="Atualizar filtro salvo"
                    aria-label="Atualizar filtro salvo"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={handleDeleteFilter}
                    title="Excluir filtro salvo"
                    aria-label="Excluir filtro salvo"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 />
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 border-b px-6 py-3 sm:px-8">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setActiveView("overview")}
              aria-label="Voltar para filtros"
            >
              <ArrowLeft />
            </Button>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Filtros</p>
              <h3 className="truncate text-base text-foreground">{activeViewTitle}</h3>
            </div>
          </div>
        )}

        <div
          ref={scrollAreaRef}
          data-testid="filter-scroll-area"
          className="min-h-0 flex-1 overflow-y-auto"
        >
          {activeView === "overview" && (
            <div className="divide-y">
              <FilterNavigationRow
                title="Cidade"
                summary={summarizeItems(selectedCidades, "Todas as cidades")}
                selectedCount={selectedCidades.length}
                onClick={() => setActiveView("cidade")}
              />
              <FilterNavigationRow
                title="Bairro"
                summary={summarizeItems(selectedBairros, "Todos os bairros")}
                selectedCount={selectedBairros.length}
                onClick={() => setActiveView("bairro")}
              />
              <FilterNavigationRow
                title="Tipo do imóvel"
                summary={summarizeItems(selectedTipos, "Todos os tipos")}
                selectedCount={selectedTipos.length}
                onClick={() => setActiveView("tipo")}
              />

              <FilterGroup title="Preço">
                <div className="grid grid-cols-2 gap-3">
                  <FormField htmlFor="minPrice" label="Valor Mínimo">
                    <Input
                      id="minPrice"
                      type="text"
                      inputMode="numeric"
                      size="sm"
                      placeholder="R$ 0"
                      value={formatToBRL(minPrice)}
                      onChange={(e) => handlePriceChange(e.target.value, "minPrice")}
                      className="tabular-nums"
                    />
                  </FormField>
                  <FormField htmlFor="maxPrice" label="Valor Máximo">
                    <Input
                      id="maxPrice"
                      type="text"
                      inputMode="numeric"
                      size="sm"
                      placeholder="R$ 999.999"
                      value={formatToBRL(maxPrice)}
                      onChange={(e) => handlePriceChange(e.target.value, "maxPrice")}
                      className="tabular-nums"
                    />
                  </FormField>
                </div>
              </FilterGroup>

              <FilterNavigationRow
                title="Imobiliária"
                summary={summarizeItems(selectedImobiliarias, "Todas as imobiliárias")}
                selectedCount={selectedImobiliarias.length}
                onClick={() => setActiveView("imobiliaria")}
              />
              <FilterNavigationRow
                title="Quartos e vagas"
                summary={
                  roomSummaryParts.length > 0
                    ? roomSummaryParts.join(" · ")
                    : "Qualquer quantidade"
                }
                selectedCount={roomFilterCount}
                onClick={() => setActiveView("rooms")}
              />
              <FilterNavigationRow
                title="Mais filtros"
                summary={
                  moreFilterCount > 0
                    ? `${moreFilterCount} ${
                        moreFilterCount === 1
                          ? "refinamento selecionado"
                          : "refinamentos selecionados"
                      }`
                    : "Suítes, banheiros, características e descrição"
                }
                selectedCount={moreFilterCount}
                onClick={() => setActiveView("more")}
              />
            </div>
          )}

          {activeView === "cidade" && (
            <FilterSection
              searchPlaceholder="Pesquisar cidade..."
              searchValue={searchCidade}
              onSearchChange={setSearchCidade}
              items={filteredCidades}
              selectedItems={selectedCidades}
              idPrefix="cidade"
              onToggle={(value, checked) => {
                updateSelectedCidades((current) =>
                  checked
                    ? [...new Set([...current, value])]
                    : current.filter((cidade) => cidade !== value)
                );
              }}
              onSelectAll={(items, select) => {
                updateSelectedCidades((current) =>
                  select
                    ? [...new Set([...current, ...items])]
                    : current.filter((cidade) => !items.includes(cidade))
                );
              }}
              emptyMessage="Nenhuma cidade encontrada"
            />
          )}

          {activeView === "bairro" && (
            <FilterSection
              searchPlaceholder="Pesquisar bairro..."
              searchValue={searchBairro}
              onSearchChange={setSearchBairro}
              items={filteredBairros}
              selectedItems={selectedBairros}
              idPrefix="bairro"
              onToggle={(value, checked) =>
                handleToggle("selectedBairros", value, checked)
              }
              onSelectAll={(items, select) => {
                setFilterState((previous) => ({
                  ...previous,
                  selectedBairros: select
                    ? [...new Set([...previous.selectedBairros, ...items])]
                    : previous.selectedBairros.filter((bairro) => !items.includes(bairro)),
                }));
              }}
              emptyMessage="Nenhum bairro encontrado"
            />
          )}

          {activeView === "tipo" && (
            <FilterSection
              searchPlaceholder="Pesquisar tipo..."
              searchValue={searchTipo}
              onSearchChange={setSearchTipo}
              items={filteredTipos}
              selectedItems={selectedTipos}
              idPrefix="tipo"
              onToggle={(value, checked) =>
                handleToggle("selectedTipos", value, checked)
              }
              onSelectAll={(items, select) => {
                setFilterState((previous) => ({
                  ...previous,
                  selectedTipos: select
                    ? [...new Set([...previous.selectedTipos, ...items])]
                    : previous.selectedTipos.filter((tipo) => !items.includes(tipo)),
                }));
              }}
              emptyMessage="Nenhum tipo encontrado"
            />
          )}

          {activeView === "imobiliaria" && (
            <FilterSection
              searchPlaceholder="Pesquisar imobiliária..."
              searchValue={searchImobiliaria}
              onSearchChange={setSearchImobiliaria}
              items={filteredImobiliarias}
              selectedItems={selectedImobiliarias}
              idPrefix="imobiliaria"
              onToggle={(value, checked) =>
                handleToggle("selectedImobiliarias", value, checked)
              }
              onSelectAll={(items, select) => {
                setFilterState((previous) => ({
                  ...previous,
                  selectedImobiliarias: select
                    ? [...new Set([...previous.selectedImobiliarias, ...items])]
                    : previous.selectedImobiliarias.filter(
                        (imobiliaria) => !items.includes(imobiliaria)
                      ),
                }));
              }}
              emptyMessage="Nenhuma imobiliária encontrada"
            />
          )}

          {activeView === "rooms" && (
            <FilterGroup title="Cômodos">
              <div className="space-y-4">
                <FixedRoomFilterSection
                  title="Quartos"
                  selectedItems={selectedQuartos}
                  selectedPlus={selectedQuartosPlus}
                  availableCounts={hasDynamicFacets || availableQuartos.length > 0 ? availableQuartos : undefined}
                  idPrefix="quartos"
                  labelSuffix="quarto"
                  onToggle={(value) =>
                    handleToggle("selectedQuartos", value, !selectedQuartos.includes(value))
                  }
                  onPlusToggle={() => handleBoolToggle("selectedQuartosPlus")}
                />
                <FixedRoomFilterSection
                  title="Vagas"
                  selectedItems={selectedVagas}
                  selectedPlus={selectedVagasPlus}
                  availableCounts={hasDynamicFacets || availableVagas.length > 0 ? availableVagas : undefined}
                  idPrefix="vagas"
                  labelSuffix="vaga"
                  onToggle={(value) =>
                    handleToggle("selectedVagas", value, !selectedVagas.includes(value))
                  }
                  onPlusToggle={() => handleBoolToggle("selectedVagasPlus")}
                />
              </div>
            </FilterGroup>
          )}

          {activeView === "more" && (
            <div className="divide-y">
              <FilterGroup title="Cômodos">
                <div className="space-y-4">
                  <FixedRoomFilterSection
                    title="Suítes"
                    selectedItems={selectedSuites}
                    selectedPlus={selectedSuitesPlus}
                    availableCounts={hasDynamicFacets || availableSuites.length > 0 ? availableSuites : undefined}
                    idPrefix="suites"
                    labelSuffix="suíte"
                    onToggle={(value) =>
                      handleToggle("selectedSuites", value, !selectedSuites.includes(value))
                    }
                    onPlusToggle={() => handleBoolToggle("selectedSuitesPlus")}
                  />
                  <FixedRoomFilterSection
                    title="Banheiros"
                    selectedItems={selectedBanheiros}
                    selectedPlus={selectedBanheirosPlus}
                    availableCounts={hasDynamicFacets || availableBanheiros.length > 0 ? availableBanheiros : undefined}
                    idPrefix="banheiros"
                    labelSuffix="banheiro"
                    onToggle={(value) =>
                      handleToggle("selectedBanheiros", value, !selectedBanheiros.includes(value))
                    }
                    onPlusToggle={() => handleBoolToggle("selectedBanheirosPlus")}
                  />
                </div>
              </FilterGroup>

              <FilterGroup title="Características">
                <Accordion type="multiple" className="rounded-xl border border-transparent bg-muted px-3">
                  {COMODIDADE_GROUPS.map((group) => {
                    const visibleKeys =
                      availableComodidades !== undefined
                        ? group.keys.filter((key) => availableComodidades.includes(key))
                        : group.keys;

                    if (visibleKeys.length === 0) {
                      return null;
                    }

                    const groupAllSelected = visibleKeys.every((key) =>
                      selectedComodidades.includes(key)
                    );
                    const groupSelectedCount = visibleKeys.filter((key) =>
                      selectedComodidades.includes(key)
                    ).length;

                    return (
                      <AccordionItem key={group.title} value={group.title}>
                        <AccordionTrigger className="cursor-pointer py-2.5 text-sm hover:no-underline">
                          <span className="flex items-center gap-2">
                            {group.title}
                            {groupSelectedCount > 0 && (
                              <SelectedCount count={groupSelectedCount} />
                            )}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-3">
                          <button
                            type="button"
                            className="mb-1 cursor-pointer text-xs text-primary hover:underline"
                            onClick={() => {
                              visibleKeys.forEach((key) => {
                                const isSelected = selectedComodidades.includes(key);
                                if (groupAllSelected && isSelected) {
                                  handleToggle("selectedComodidades", key, false);
                                } else if (!groupAllSelected && !isSelected) {
                                  handleToggle("selectedComodidades", key, true);
                                }
                              });
                            }}
                          >
                            {groupAllSelected ? "Desmarcar tudo" : "Selecionar tudo"}
                          </button>
                          <div className="-mx-2">
                            {visibleKeys.map((key) => (
                              <CheckboxRow
                                key={key}
                                id={`comodidade-${key}`}
                                label={COMODIDADE_LABELS[key]}
                                checked={selectedComodidades.includes(key)}
                                onCheckedChange={(checked) =>
                                  handleToggle("selectedComodidades", key, checked)
                                }
                              />
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </FilterGroup>

              <FilterGroup title="Descrição" htmlFor="filter-description">
                <Input
                  id="filter-description"
                  size="sm"
                  placeholder="Buscar na descrição do imóvel..."
                  value={descricao}
                  onChange={(e) =>
                    setFilterState((previous) => ({ ...previous, descricao: e.target.value }))
                  }
                />
              </FilterGroup>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 sm:px-8">
          <Button
            type="button"
            onClick={applyFilters}
            className="w-full"
          >
            <Search />
            Buscar imóveis
          </Button>
        </div>
      </Card>

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md">
          <DialogHeader className="gap-1 border-b px-6 py-5 text-left">
            <DialogTitle>Salvar filtro</DialogTitle>
            <DialogDescription>
              Dê um nome para identificar este conjunto de filtros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <FormField htmlFor="saved-filter-name" label="Nome do filtro" required>
              <Input
                id="saved-filter-name"
                placeholder="Ex: Apartamentos Centro até R$500k"
                value={newFilterName}
                onChange={(e) => setNewFilterName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSaveNewFilter();
                  }
                }}
                autoFocus
              />
            </FormField>
          </div>
          <DialogFooter className="gap-2 border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => {
                setSaveDialogOpen(false);
                setNewFilterName("");
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveNewFilter} disabled={!newFilterName.trim()}>
              <Save />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- Layout helpers ---

function FilterGroup({
  title,
  htmlFor,
  actions,
  children,
}: {
  title: React.ReactNode;
  htmlFor?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const titleClassName = "text-xs tracking-wide text-muted-foreground uppercase";

  return (
    <div className="space-y-3 px-6 py-4 sm:px-8">
      <div className="flex min-h-5 items-center justify-between gap-2">
        {htmlFor ? (
          <label htmlFor={htmlFor} className={titleClassName}>
            {title}
          </label>
        ) : (
          <h3 className={cn("flex items-center gap-2", titleClassName)}>{title}</h3>
        )}
        {actions}
      </div>
      {children}
    </div>
  );
}

function SelectedCount({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-primary/10 px-1.5 text-xs leading-5 text-primary normal-case tabular-nums">
      {count}
    </span>
  );
}

function SelectAllButton({
  allSelected,
  onClick,
}: {
  allSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="cursor-pointer text-xs text-primary hover:underline"
      onClick={onClick}
    >
      {allSelected ? "Desmarcar tudo" : "Selecionar tudo"}
    </button>
  );
}

function CheckboxRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
      <Label
        htmlFor={id}
        className="flex-1 cursor-pointer text-sm text-foreground"
      >
        {label}
      </Label>
    </div>
  );
}

function FilterNavigationRow({
  title,
  summary,
  selectedCount,
  onClick,
}: {
  title: string;
  summary: string;
  selectedCount: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}: ${summary}`}
      className="flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40 sm:px-8"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm text-foreground">
          {title}
          {selectedCount > 0 && <SelectedCount count={selectedCount} />}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
          {summary}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

// --- Fixed room filter section (1-4 + 4+) ---

interface FixedRoomFilterSectionProps {
  title: string;
  selectedItems: number[];
  selectedPlus: boolean;
  /** Counts that still have properties; undefined shows every option. */
  availableCounts?: number[];
  idPrefix: string;
  labelSuffix: string;
  onToggle: (value: number) => void;
  onPlusToggle: () => void;
}

function FixedRoomFilterSection({
  title,
  selectedItems,
  selectedPlus,
  availableCounts,
  idPrefix,
  labelSuffix,
  onToggle,
  onPlusToggle,
}: FixedRoomFilterSectionProps) {
  const visibleRoomOptions =
    availableCounts !== undefined
      ? FIXED_ROOM_OPTIONS.filter((num) => availableCounts.includes(num))
      : FIXED_ROOM_OPTIONS;
  const showPlusOption =
    availableCounts !== undefined ? availableCounts.some((num) => num >= 4) : true;
  const allSelected =
    visibleRoomOptions.length > 0 &&
    visibleRoomOptions.every((num) => selectedItems.includes(num));

  const options = [
    ...visibleRoomOptions.map((num) => ({
      id: `${idPrefix}-${num}`,
      short: String(num),
      label: num === 1 ? `1 ${labelSuffix}` : `${num} ${labelSuffix}s`,
      checked: selectedItems.includes(num),
      onToggle: () => onToggle(num),
    })),
    ...(showPlusOption
      ? [{
          id: `${idPrefix}-plus`,
          short: "4+",
          label: `4+ ${labelSuffix}s`,
          checked: selectedPlus,
          onToggle: onPlusToggle,
        }]
      : []),
  ];

  return (
    <div role="group" aria-labelledby={`${idPrefix}-title`} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span id={`${idPrefix}-title`} className="text-sm text-foreground">
          {title}
        </span>
        {visibleRoomOptions.length > 0 && (
          <SelectAllButton
            allSelected={allSelected}
            onClick={() => {
              visibleRoomOptions.forEach((num) => {
                const isSelected = selectedItems.includes(num);
                if (allSelected === isSelected) onToggle(num);
              });
            }}
          />
        )}
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {options.map((option) => (
          <label
            key={option.id}
            htmlFor={option.id}
            title={option.label}
            className={cn(
              "flex h-9 cursor-pointer items-center justify-center rounded-lg border bg-background text-sm text-foreground tabular-nums transition-colors hover:bg-muted/50",
              "has-focus-visible:ring-2 has-focus-visible:ring-ring/40",
              option.checked && "border-primary bg-primary/10 text-primary hover:bg-primary/10"
            )}
          >
            <Checkbox
              id={option.id}
              aria-label={option.label}
              checked={option.checked}
              onCheckedChange={option.onToggle}
              className="sr-only"
            />
            {option.short}
          </label>
        ))}
      </div>
      {options.length === 0 && (
        <p className="py-2 text-center text-xs text-muted-foreground">
          Nenhuma opção disponível
        </p>
      )}
    </div>
  );
}

// --- Reusable filter section for string-based filters ---

interface FilterSectionProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  items: string[];
  selectedItems: string[];
  idPrefix: string;
  onToggle: (value: string, checked: boolean) => void;
  onSelectAll?: (items: string[], select: boolean) => void;
  emptyMessage: string;
}

function FilterSection({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  items,
  selectedItems,
  idPrefix,
  onToggle,
  onSelectAll,
  emptyMessage,
}: FilterSectionProps) {
  const allSelected = items.length > 0 && items.every((item) => selectedItems.includes(item));

  return (
    <div className="space-y-3 px-6 py-4 sm:px-8">
      <div className="flex min-h-5 items-center justify-between gap-2">
        <span className="text-xs tracking-wide text-muted-foreground uppercase">
          {selectedItems.length > 0
            ? `${selectedItems.length} ${selectedItems.length === 1 ? "selecionado" : "selecionados"}`
            : "Nenhum selecionado"}
        </span>
        {onSelectAll && items.length > 0 && (
          <SelectAllButton
            allSelected={allSelected}
            onClick={() => onSelectAll(items, !allSelected)}
          />
        )}
      </div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          size="sm"
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="-mx-2">
        {items.map((item) => (
          <CheckboxRow
            key={item}
            id={`${idPrefix}-${item}`}
            label={item}
            checked={selectedItems.includes(item)}
            onCheckedChange={(checked) => onToggle(item, checked)}
          />
        ))}
        {items.length === 0 && (
          <p className="px-2 py-2 text-center text-xs text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
