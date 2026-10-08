"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  Trash2,
} from "lucide-react";
import type {
  AiSearcherProperty,
  AiSearcherFiltersState,
  AiSearcherFiltersOptions,
  SavedFilter,
} from "./types";
import api, { API_PREFIX } from "@/services/api";
import { getMarketPropertyFilters } from "@/services/marketPropertyService";

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

  useEffect(() => {
    getMarketPropertyFilters()
      .then((filters) => setFilterOptions(filters))
      .catch(console.error);
  }, []);

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

  const filterStateKey = JSON.stringify(filterState);

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
  } = filterOptions;

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
      <div
        data-testid="property-filter-panel"
        className="flex h-[calc(100vh-6rem)] w-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
      >
        <div className="p-4 pb-3">
          {activeView === "overview" ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <h3 className="whitespace-nowrap text-lg font-semibold text-foreground">
                    Filtros
                  </h3>
                  {activeFilterCount > 0 && (
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="shrink-0 cursor-pointer text-sm font-medium text-primary hover:underline"
                >
                  Limpar
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <Select
                  value={activeFilterId ?? ""}
                  onValueChange={handleSelectFilter}
                >
                  <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
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
                      savedFilters.map((filter) => (
                        <SelectItem
                          key={filter.id}
                          value={filter.id}
                          className="cursor-pointer text-xs"
                        >
                          {filter.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={() => setSaveDialogOpen(true)}
                  title="Salvar filtro atual"
                >
                  <Save className="size-3.5" />
                </Button>

                {hasActiveFilter && (
                  <>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={handleUpdateFilter}
                      title="Atualizar filtro salvo"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={handleDeleteFilter}
                      title="Excluir filtro salvo"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => setActiveView("overview")}
                aria-label="Voltar para filtros"
                className="shrink-0"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Filtros</p>
                <h3 className="truncate text-base font-semibold text-foreground">
                  {activeViewTitle}
                </h3>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <div
          ref={scrollAreaRef}
          data-testid="filter-scroll-area"
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        >
          {activeView === "overview" && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Essenciais
              </p>
              <div className="divide-y overflow-hidden rounded-lg border">
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

                <div className="space-y-2 px-3 py-3">
                  <h4 className="text-sm font-medium text-foreground">Preço</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <Label
                        htmlFor="minPrice"
                        className="text-xs text-muted-foreground"
                      >
                        Mínimo
                      </Label>
                      <Input
                        id="minPrice"
                        type="text"
                        placeholder="R$ 0"
                        value={formatToBRL(minPrice)}
                        onChange={(event) =>
                          handlePriceChange(event.target.value, "minPrice")
                        }
                        className="mt-1 h-9 px-3"
                      />
                    </div>
                    <div className="min-w-0">
                      <Label
                        htmlFor="maxPrice"
                        className="text-xs text-muted-foreground"
                      >
                        Máximo
                      </Label>
                      <Input
                        id="maxPrice"
                        type="text"
                        placeholder="R$ 999 mil"
                        value={formatToBRL(maxPrice)}
                        onChange={(event) =>
                          handlePriceChange(event.target.value, "maxPrice")
                        }
                        className="mt-1 h-9 px-3"
                      />
                    </div>
                  </div>
                </div>

                <FilterNavigationRow
                  title="Imobiliária"
                  summary={summarizeItems(
                    selectedImobiliarias,
                    "Todas as imobiliárias"
                  )}
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
                    : previous.selectedBairros.filter(
                        (bairro) => !items.includes(bairro)
                      ),
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
                    : previous.selectedTipos.filter(
                        (tipo) => !items.includes(tipo)
                      ),
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
            <div className="space-y-6">
              <FixedRoomFilterSection
                title="Quartos"
                selectedItems={selectedQuartos}
                selectedPlus={selectedQuartosPlus}
                idPrefix="quartos"
                labelSuffix="quarto"
                onToggle={(value) =>
                  handleToggle(
                    "selectedQuartos",
                    value,
                    !selectedQuartos.includes(value)
                  )
                }
                onPlusToggle={() => handleBoolToggle("selectedQuartosPlus")}
              />
              <Separator />
              <FixedRoomFilterSection
                title="Vagas"
                selectedItems={selectedVagas}
                selectedPlus={selectedVagasPlus}
                idPrefix="vagas"
                labelSuffix="vaga"
                onToggle={(value) =>
                  handleToggle(
                    "selectedVagas",
                    value,
                    !selectedVagas.includes(value)
                  )
                }
                onPlusToggle={() => handleBoolToggle("selectedVagasPlus")}
              />
            </div>
          )}

          {activeView === "more" && (
            <div className="space-y-6">
              <FixedRoomFilterSection
                title="Suítes"
                selectedItems={selectedSuites}
                selectedPlus={selectedSuitesPlus}
                idPrefix="suites"
                labelSuffix="suíte"
                onToggle={(value) =>
                  handleToggle(
                    "selectedSuites",
                    value,
                    !selectedSuites.includes(value)
                  )
                }
                onPlusToggle={() => handleBoolToggle("selectedSuitesPlus")}
              />

              <Separator />

              <FixedRoomFilterSection
                title="Banheiros"
                selectedItems={selectedBanheiros}
                selectedPlus={selectedBanheirosPlus}
                idPrefix="banheiros"
                labelSuffix="banheiro"
                onToggle={(value) =>
                  handleToggle(
                    "selectedBanheiros",
                    value,
                    !selectedBanheiros.includes(value)
                  )
                }
                onPlusToggle={() => handleBoolToggle("selectedBanheirosPlus")}
              />

              <Separator />

              <div>
                <h4 className="mb-3 text-sm font-semibold text-foreground">
                  Características
                </h4>
                <Accordion type="multiple" className="rounded-lg border px-3">
                  {COMODIDADE_GROUPS.map((group) => {
                    const groupAllSelected = group.keys.every((key) =>
                      selectedComodidades.includes(key)
                    );

                    return (
                      <AccordionItem key={group.title} value={group.title}>
                        <AccordionTrigger className="cursor-pointer py-2 text-sm">
                          {group.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-1">
                            <button
                              type="button"
                              className="mb-1 cursor-pointer text-xs text-primary hover:underline"
                              onClick={() => {
                                if (groupAllSelected) {
                                  group.keys.forEach((key) => {
                                    if (selectedComodidades.includes(key)) {
                                      handleToggle(
                                        "selectedComodidades",
                                        key,
                                        false
                                      );
                                    }
                                  });
                                } else {
                                  group.keys.forEach((key) => {
                                    if (!selectedComodidades.includes(key)) {
                                      handleToggle(
                                        "selectedComodidades",
                                        key,
                                        true
                                      );
                                    }
                                  });
                                }
                              }}
                            >
                              {groupAllSelected
                                ? "Desmarcar tudo"
                                : "Selecionar tudo"}
                            </button>
                            {group.keys.map((key) => (
                              <div
                                key={key}
                                className="flex items-center space-x-2"
                              >
                                <Checkbox
                                  id={`comodidade-${key}`}
                                  checked={selectedComodidades.includes(key)}
                                  onCheckedChange={(checked) =>
                                    handleToggle(
                                      "selectedComodidades",
                                      key,
                                      checked as boolean
                                    )
                                  }
                                />
                                <Label
                                  htmlFor={`comodidade-${key}`}
                                  className="cursor-pointer text-sm text-muted-foreground"
                                >
                                  {COMODIDADE_LABELS[key]}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>

              <Separator />

              <div>
                <Label
                  htmlFor="filter-description"
                  className="text-sm font-semibold text-foreground"
                >
                  Descrição
                </Label>
                <Input
                  id="filter-description"
                  placeholder="Buscar na descrição do imóvel..."
                  value={descricao}
                  onChange={(event) =>
                    setFilterState((previous) => ({
                      ...previous,
                      descricao: event.target.value,
                    }))
                  }
                  className="mt-3"
                />
              </div>
            </div>
          )}
        </div>

        <div className="border-t bg-card/95 p-4">
          <Button
            type="button"
            onClick={applyFilters}
            className="h-12 w-full cursor-pointer gap-2 text-base font-semibold"
          >
            <Search className="h-5 w-5" />
            Buscar imóveis
          </Button>
        </div>
      </div>

      {/* Save Filter Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar filtro</DialogTitle>
            <DialogDescription>
              Dê um nome para identificar este conjunto de filtros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Input
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
          </div>
          <DialogFooter>
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface FilterNavigationRowProps {
  title: string;
  summary: string;
  selectedCount: number;
  onClick: () => void;
}

function FilterNavigationRow({
  title,
  summary,
  selectedCount,
  onClick,
}: FilterNavigationRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${title}: ${summary}`}
      className="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          {title}
          {selectedCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {selectedCount}
            </span>
          )}
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
  idPrefix: string;
  labelSuffix: string;
  onToggle: (value: number) => void;
  onPlusToggle: () => void;
}

function FixedRoomFilterSection({
  title,
  selectedItems,
  selectedPlus,
  idPrefix,
  labelSuffix,
  onToggle,
  onPlusToggle,
}: FixedRoomFilterSectionProps) {
  const allSelected = FIXED_ROOM_OPTIONS.every((num) => selectedItems.includes(num));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
        <button
          type="button"
          className="text-xs text-primary hover:underline cursor-pointer"
          onClick={() => {
            if (allSelected) {
              FIXED_ROOM_OPTIONS.forEach((num) => {
                if (selectedItems.includes(num)) onToggle(num);
              });
            } else {
              FIXED_ROOM_OPTIONS.forEach((num) => {
                if (!selectedItems.includes(num)) onToggle(num);
              });
            }
          }}
        >
          {allSelected ? "Desmarcar tudo" : "Selecionar tudo"}
        </button>
      </div>
      <div className="space-y-2">
        {FIXED_ROOM_OPTIONS.map((num) => (
          <div key={num} className="flex items-center space-x-2">
            <Checkbox
              id={`${idPrefix}-${num}`}
              checked={selectedItems.includes(num)}
              onCheckedChange={() => onToggle(num)}
            />
            <Label
              htmlFor={`${idPrefix}-${num}`}
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {num === 1 ? `1 ${labelSuffix}` : `${num} ${labelSuffix}s`}
            </Label>
          </div>
        ))}
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}-plus`}
            checked={selectedPlus}
            onCheckedChange={onPlusToggle}
          />
          <Label
            htmlFor={`${idPrefix}-plus`}
            className="text-sm text-muted-foreground cursor-pointer"
          >
            4+ {labelSuffix}s
          </Label>
        </div>
      </div>
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
    <div>
      {onSelectAll && items.length > 0 && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            className="cursor-pointer text-xs text-primary hover:underline"
            onClick={() => onSelectAll(items, !allSelected)}
          >
            {allSelected ? "Desmarcar tudo" : "Selecionar tudo"}
          </button>
        </div>
      )}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex items-center space-x-2">
            <Checkbox
              id={`${idPrefix}-${item}`}
              checked={selectedItems.includes(item)}
              onCheckedChange={(checked) => onToggle(item, checked as boolean)}
            />
            <Label
              htmlFor={`${idPrefix}-${item}`}
              className="cursor-pointer text-sm text-muted-foreground"
            >
              {item}
            </Label>
          </div>
        ))}
        {items.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
