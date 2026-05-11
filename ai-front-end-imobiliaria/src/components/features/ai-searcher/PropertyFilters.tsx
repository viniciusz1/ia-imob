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
  Search,
  Save,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type {
  AiSearcherProperty,
  AiSearcherFiltersState,
  AiSearcherFiltersOptions,
  SavedFilter,
} from "./types";
import api, { API_PREFIX } from "@/services/api";

interface PropertyFiltersProps {
  properties: AiSearcherProperty[];
  onFilterChange: (filtered: AiSearcherProperty[]) => void;
  initialState: AiSearcherFiltersState;
  onFilterStateChange: (state: AiSearcherFiltersState) => void;
  onCollapseChange?: (collapsed: boolean) => void;
  collapsed?: boolean;
}

const FIXED_ROOM_OPTIONS = [1, 2, 3, 4];

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
  minPrice: "",
  maxPrice: "",
};

export function PropertyFilters(
  props: PropertyFiltersProps
) {
  const {
    initialState,
    onFilterStateChange,
    onCollapseChange,
    collapsed = false,
  } = props;
  const [filterState, setFilterState] = useState<AiSearcherFiltersState>(initialState);
  const [filterOptions, setFilterOptions] = useState<AiSearcherFiltersOptions>({
    tipos: [],
    bairros: [],
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

  const isCommittingRef = useRef(false);

  useEffect(() => {
    api
      .get(`${API_PREFIX}/scrapy-properties/filters`)
      .then((res) => setFilterOptions(res.data))
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStateKey]);

  const { tipos, bairros, cidades, imobiliarias } = filterOptions;

  const filteredTipos = tipos.filter((t) =>
    t.toLowerCase().includes(searchTipo.toLowerCase())
  );
  const filteredBairros = bairros.filter((b) =>
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
  }, [filterState, commitFilterState]);

  const clearFilters = useCallback(() => {
    setFilterState(EMPTY_FILTER_STATE);
    setSearchTipo("");
    setSearchBairro("");
    setSearchCidade("");
    setSearchImobiliaria("");
    setActiveFilterId(null);
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

  const handleToggleCollapse = useCallback(() => {
    const next = !collapsed;
    onCollapseChange?.(next);
  }, [collapsed, onCollapseChange]);

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
    minPrice ? 1 : 0,
    maxPrice ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <>
      <div className="bg-card rounded-xl border shadow-sm p-4 sticky top-20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">
              Filtros
            </h3>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center size-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={clearFilters}
              className="text-sm text-primary hover:underline font-medium cursor-pointer"
            >
              Limpar
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={handleToggleCollapse}
              title={collapsed ? "Expandir filtros" : "Recolher filtros"}
            >
              {collapsed ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronUp className="size-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Saved Filters Toolbar */}
        <div className="flex items-center gap-2 mb-3">
          <Select
            value={activeFilterId ?? ""}
            onValueChange={handleSelectFilter}
          >
            <SelectTrigger className="flex-1 min-w-0 h-8 text-xs">
              <SelectValue placeholder="Filtros salvos..." />
            </SelectTrigger>
            <SelectContent>
              {savedFiltersLoading ? (
                <div className="px-2 py-6 text-xs text-muted-foreground text-center">
                  Carregando...
                </div>
              ) : savedFilters.length === 0 ? (
                <div className="px-2 py-6 text-xs text-muted-foreground text-center">
                  Nenhum filtro salvo
                </div>
              ) : (
                savedFilters.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs cursor-pointer">
                    {f.name}
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

        <Separator className="mb-3" />

        {!collapsed && (
          <div className="space-y-6 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 pb-4">
            {/* Preço */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 text-sm">
                Preço
              </h4>
              <div className="space-y-3">
                <div>
                  <Label
                    htmlFor="minPrice"
                    className="text-sm text-muted-foreground"
                  >
                    Valor Mínimo
                  </Label>
                  <Input
                    id="minPrice"
                    type="text"
                    placeholder="R$ 0"
                    value={formatToBRL(minPrice)}
                    onChange={(e) => handlePriceChange(e.target.value, "minPrice")}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="maxPrice"
                    className="text-sm text-muted-foreground"
                  >
                    Valor Máximo
                  </Label>
                  <Input
                    id="maxPrice"
                    type="text"
                    placeholder="R$ 999.999"
                    value={formatToBRL(maxPrice)}
                    onChange={(e) => handlePriceChange(e.target.value, "maxPrice")}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tipo de Imóvel */}
            <FilterSection
              title="Tipo de Imóvel"
              searchPlaceholder="Pesquisar tipo..."
              searchValue={searchTipo}
              onSearchChange={setSearchTipo}
              items={filteredTipos}
              selectedItems={selectedTipos}
              idPrefix="tipo"
              onToggle={(val, checked) =>
                handleToggle("selectedTipos", val, checked)
              }
              emptyMessage="Nenhum tipo encontrado"
            />

            <Separator />

            {/* Cidade */}
            <FilterSection
              title="Cidade"
              searchPlaceholder="Pesquisar cidade..."
              searchValue={searchCidade}
              onSearchChange={setSearchCidade}
              items={filteredCidades}
              selectedItems={selectedCidades}
              idPrefix="cidade"
              onToggle={(val, checked) =>
                handleToggle("selectedCidades", val, checked)
              }
              emptyMessage="Nenhuma cidade encontrada"
            />

            <Separator />

            {/* Bairro */}
            <FilterSection
              title="Bairro"
              searchPlaceholder="Pesquisar bairro..."
              searchValue={searchBairro}
              onSearchChange={setSearchBairro}
              items={filteredBairros}
              selectedItems={selectedBairros}
              idPrefix="bairro"
              onToggle={(val, checked) =>
                handleToggle("selectedBairros", val, checked)
              }
              emptyMessage="Nenhum bairro encontrado"
            />

            <Separator />

            {/* Imobiliária */}
            <FilterSection
              title="Imobiliária"
              searchPlaceholder="Pesquisar imobiliária..."
              searchValue={searchImobiliaria}
              onSearchChange={setSearchImobiliaria}
              items={filteredImobiliarias}
              selectedItems={selectedImobiliarias}
              idPrefix="imobiliaria"
              onToggle={(val, checked) =>
                handleToggle("selectedImobiliarias", val, checked)
              }
              emptyMessage="Nenhuma imobiliária encontrada"
            />

            <Separator />

            {/* Quartos */}
            <FixedRoomFilterSection
              title="Quartos"
              selectedItems={selectedQuartos}
              selectedPlus={selectedQuartosPlus}
              idPrefix="quartos"
              labelSuffix="quarto"
              onToggle={(val) =>
                handleToggle("selectedQuartos", val, !selectedQuartos.includes(val))
              }
              onPlusToggle={() => handleBoolToggle("selectedQuartosPlus")}
            />

            {/* Suites */}
            <FixedRoomFilterSection
              title="Suítes"
              selectedItems={selectedSuites}
              selectedPlus={selectedSuitesPlus}
              idPrefix="suites"
              labelSuffix="suíte"
              onToggle={(val) =>
                handleToggle("selectedSuites", val, !selectedSuites.includes(val))
              }
              onPlusToggle={() => handleBoolToggle("selectedSuitesPlus")}
            />

            {/* Banheiros */}
            <FixedRoomFilterSection
              title="Banheiros"
              selectedItems={selectedBanheiros}
              selectedPlus={selectedBanheirosPlus}
              idPrefix="banheiros"
              labelSuffix="banheiro"
              onToggle={(val) =>
                handleToggle("selectedBanheiros", val, !selectedBanheiros.includes(val))
              }
              onPlusToggle={() => handleBoolToggle("selectedBanheirosPlus")}
            />

            {/* Vagas */}
            <FixedRoomFilterSection
              title="Vagas"
              selectedItems={selectedVagas}
              selectedPlus={selectedVagasPlus}
              idPrefix="vagas"
              labelSuffix="vaga"
              onToggle={(val) =>
                handleToggle("selectedVagas", val, !selectedVagas.includes(val))
              }
              onPlusToggle={() => handleBoolToggle("selectedVagasPlus")}
            />

            {COMODIDADE_GROUPS.some((g) => g.keys.length > 0) && (
              <>
                <Separator />

                {/* Comodidades */}
                <div>
                  <h4 className="font-semibold text-foreground mb-3 text-sm">
                    Características
                  </h4>
                  <Accordion type="multiple" className="border rounded-lg px-3">
                    {COMODIDADE_GROUPS.map((group) => (
                      <AccordionItem key={group.title} value={group.title}>
                        <AccordionTrigger className="text-sm py-2 cursor-pointer">
                          {group.title}
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-1">
                            {group.keys.map((key) => (
                              <div key={key} className="flex items-center space-x-2">
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
                                  className="text-sm text-muted-foreground cursor-pointer"
                                >
                                  {COMODIDADE_LABELS[key]}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </>
            )}
          </div>
        )}

        {collapsed && activeFilterCount > 0 && (
          <p className="text-xs text-muted-foreground mb-3">
            {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""} ativo
            {activeFilterCount !== 1 ? "s" : ""}
          </p>
        )}

        <div className="-mx-4 -mb-4 mt-4 border-t bg-card/95 px-4 py-4">
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
  return (
    <div>
      <h4 className="font-semibold text-foreground mb-3 text-sm">{title}</h4>
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
  title: string;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  items: string[];
  selectedItems: string[];
  idPrefix: string;
  onToggle: (value: string, checked: boolean) => void;
  emptyMessage: string;
}

function FilterSection({
  title,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  items,
  selectedItems,
  idPrefix,
  onToggle,
  emptyMessage,
}: FilterSectionProps) {
  return (
    <div>
      <h4 className="font-semibold text-foreground mb-3 text-sm">{title}</h4>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          type="text"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div key={item} className="flex items-center space-x-2">
            <Checkbox
              id={`${idPrefix}-${item}`}
              checked={selectedItems.includes(item)}
              onCheckedChange={(checked) => onToggle(item, checked as boolean)}
            />
            <Label
              htmlFor={`${idPrefix}-${item}`}
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {item}
            </Label>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {emptyMessage}
          </p>
        )}
      </div>
    </div>
  );
}
