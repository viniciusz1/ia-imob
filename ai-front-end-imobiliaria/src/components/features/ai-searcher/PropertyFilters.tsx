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
import { getMarketPropertyFilters } from "@/services/marketPropertyService";

interface PropertyFiltersProps {
  properties: AiSearcherProperty[];
  onFilterChange: (filtered: AiSearcherProperty[]) => void;
  initialState: AiSearcherFiltersState;
  onFilterStateChange: (state: AiSearcherFiltersState) => void;
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
  descricao: "",
  minPrice: "",
  maxPrice: "",
};

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

  const isCommittingRef = useRef(false);

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

  return (
    <>
      <Card className="gap-0 overflow-hidden py-0">
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
        <div className="flex items-center gap-2 border-b px-4 py-3 sm:px-5">
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

        <div className="divide-y lg:max-h-[calc(100vh-26rem)] lg:overflow-y-auto">
          {/* Preço */}
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

          {/* Descrição */}
          <FilterGroup title="Descrição" htmlFor="descricao">
            <Input
              id="descricao"
              size="sm"
              placeholder="Buscar na descrição do imóvel..."
              value={descricao}
              onChange={(e) => setFilterState((prev) => ({ ...prev, descricao: e.target.value }))}
            />
          </FilterGroup>

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
            onSelectAll={(items, select) => {
              setFilterState((prev) => ({
                ...prev,
                selectedTipos: select
                  ? [...new Set([...prev.selectedTipos, ...items])]
                  : prev.selectedTipos.filter((t) => !items.includes(t)),
              }));
            }}
            emptyMessage="Nenhum tipo encontrado"
          />

          {/* Cidade */}
          <FilterSection
            title="Cidade"
            searchPlaceholder="Pesquisar cidade..."
            searchValue={searchCidade}
            onSearchChange={setSearchCidade}
            items={filteredCidades}
            selectedItems={selectedCidades}
            idPrefix="cidade"
            onToggle={(val, checked) => {
              updateSelectedCidades((current) => checked
                ? [...new Set([...current, val])]
                : current.filter((cidade) => cidade !== val));
            }}
            onSelectAll={(items, select) => {
              updateSelectedCidades((current) => select
                ? [...new Set([...current, ...items])]
                : current.filter((cidade) => !items.includes(cidade)));
            }}
            emptyMessage="Nenhuma cidade encontrada"
          />

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
            onSelectAll={(items, select) => {
              setFilterState((prev) => ({
                ...prev,
                selectedBairros: select
                  ? [...new Set([...prev.selectedBairros, ...items])]
                  : prev.selectedBairros.filter((b) => !items.includes(b)),
              }));
            }}
            emptyMessage="Nenhum bairro encontrado"
          />

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
            onSelectAll={(items, select) => {
              setFilterState((prev) => ({
                ...prev,
                selectedImobiliarias: select
                  ? [...new Set([...prev.selectedImobiliarias, ...items])]
                  : prev.selectedImobiliarias.filter((i) => !items.includes(i)),
              }));
            }}
            emptyMessage="Nenhuma imobiliária encontrada"
          />

          {/* Cômodos */}
          <FilterGroup title="Cômodos">
            <div className="space-y-4">
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
            </div>
          </FilterGroup>

          {COMODIDADE_GROUPS.some((g) => g.keys.length > 0) && (
            <FilterGroup title="Características">
              <Accordion type="multiple" className="rounded-lg border px-3">
                {COMODIDADE_GROUPS.map((group) => {
                  const groupAllSelected = group.keys.every((key) =>
                    selectedComodidades.includes(key)
                  );
                  const groupSelectedCount = group.keys.filter((key) =>
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
                            if (groupAllSelected) {
                              group.keys.forEach((key) => {
                                if (selectedComodidades.includes(key)) {
                                  handleToggle("selectedComodidades", key, false);
                                }
                              });
                            } else {
                              group.keys.forEach((key) => {
                                if (!selectedComodidades.includes(key)) {
                                  handleToggle("selectedComodidades", key, true);
                                }
                              });
                            }
                          }}
                        >
                          {groupAllSelected ? "Desmarcar tudo" : "Selecionar tudo"}
                        </button>
                        <div className="-mx-2">
                          {group.keys.map((key) => (
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
          )}
        </div>

        <div className="border-t px-4 py-4 sm:px-5">
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
    <div className="space-y-3 px-4 py-4 sm:px-5">
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

  const options = [
    ...FIXED_ROOM_OPTIONS.map((num) => ({
      id: `${idPrefix}-${num}`,
      short: String(num),
      label: num === 1 ? `1 ${labelSuffix}` : `${num} ${labelSuffix}s`,
      checked: selectedItems.includes(num),
      onToggle: () => onToggle(num),
    })),
    {
      id: `${idPrefix}-plus`,
      short: "4+",
      label: `4+ ${labelSuffix}s`,
      checked: selectedPlus,
      onToggle: onPlusToggle,
    },
  ];

  return (
    <div role="group" aria-labelledby={`${idPrefix}-title`} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span id={`${idPrefix}-title`} className="text-sm text-foreground">
          {title}
        </span>
        <SelectAllButton
          allSelected={allSelected}
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
        />
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
              option.checked && "border-primary/30 bg-primary/10 text-primary hover:bg-primary/10"
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
  onSelectAll?: (items: string[], select: boolean) => void;
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
  onSelectAll,
  emptyMessage,
}: FilterSectionProps) {
  const allSelected = items.length > 0 && items.every((item) => selectedItems.includes(item));

  return (
    <FilterGroup
      title={
        <>
          {title}
          {selectedItems.length > 0 && (
            <SelectedCount count={selectedItems.length} />
          )}
        </>
      }
      actions={
        onSelectAll && items.length > 0 && (
          <SelectAllButton
            allSelected={allSelected}
            onClick={() => onSelectAll(items, !allSelected)}
          />
        )
      }
    >
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
      <div className="-mx-2 max-h-48 overflow-y-auto">
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
    </FilterGroup>
  );
}
