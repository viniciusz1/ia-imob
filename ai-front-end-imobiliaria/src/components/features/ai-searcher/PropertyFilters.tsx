"use client";

import { useState, useEffect, useRef } from "react";
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
import { Search } from "lucide-react";
import type { AiSearcherProperty, AiSearcherFiltersState, AiSearcherFiltersOptions } from "./types";
import api, { API_PREFIX } from "@/services/api";

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
  minPrice: "",
  maxPrice: "",
};

export function PropertyFilters({
  properties,
  onFilterChange,
  initialState,
  onFilterStateChange,
}: PropertyFiltersProps) {
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

  useEffect(() => {
    api.get(`${API_PREFIX}/scrapy-properties/filters`)
      .then(res => setFilterOptions(res.data))
      .catch(console.error);
  }, []);

  const [selectedTipos, setSelectedTipos] = useState<string[]>(
    initialState.selectedTipos
  );
  const [selectedBairros, setSelectedBairros] = useState<string[]>(
    initialState.selectedBairros
  );
  const [selectedCidades, setSelectedCidades] = useState<string[]>(
    initialState.selectedCidades
  );
  const [selectedImobiliarias, setSelectedImobiliarias] = useState<string[]>(
    initialState.selectedImobiliarias
  );
  const [selectedQuartos, setSelectedQuartos] = useState<number[]>(
    initialState.selectedQuartos
  );
  const [selectedQuartosPlus, setSelectedQuartosPlus] = useState<boolean>(
    initialState.selectedQuartosPlus
  );
  const [selectedSuites, setSelectedSuites] = useState<number[]>(
    initialState.selectedSuites
  );
  const [selectedSuitesPlus, setSelectedSuitesPlus] = useState<boolean>(
    initialState.selectedSuitesPlus
  );
  const [selectedBanheiros, setSelectedBanheiros] = useState<number[]>(
    initialState.selectedBanheiros
  );
  const [selectedBanheirosPlus, setSelectedBanheirosPlus] = useState<boolean>(
    initialState.selectedBanheirosPlus
  );
  const [selectedVagas, setSelectedVagas] = useState<number[]>(
    initialState.selectedVagas
  );
  const [selectedVagasPlus, setSelectedVagasPlus] = useState<boolean>(
    initialState.selectedVagasPlus
  );
  const [selectedComodidades, setSelectedComodidades] = useState<string[]>(
    initialState.selectedComodidades
  );
  const [minPrice, setMinPrice] = useState<string>(initialState.minPrice);
  const [maxPrice, setMaxPrice] = useState<string>(initialState.maxPrice);

  const [searchTipo, setSearchTipo] = useState<string>("");
  const [searchBairro, setSearchBairro] = useState<string>("");
  const [searchCidade, setSearchCidade] = useState<string>("");
  const [searchImobiliaria, setSearchImobiliaria] = useState<string>("");

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

  // Sync internal state when URL changes (back/forward)
  useEffect(() => {
    setSelectedTipos(initialState.selectedTipos);
    setSelectedBairros(initialState.selectedBairros);
    setSelectedCidades(initialState.selectedCidades);
    setSelectedImobiliarias(initialState.selectedImobiliarias);
    setSelectedQuartos(initialState.selectedQuartos);
    setSelectedQuartosPlus(initialState.selectedQuartosPlus);
    setSelectedSuites(initialState.selectedSuites);
    setSelectedSuitesPlus(initialState.selectedSuitesPlus);
    setSelectedBanheiros(initialState.selectedBanheiros);
    setSelectedBanheirosPlus(initialState.selectedBanheirosPlus);
    setSelectedVagas(initialState.selectedVagas);
    setSelectedVagasPlus(initialState.selectedVagasPlus);
    setSelectedComodidades(initialState.selectedComodidades);
    setMinPrice(initialState.minPrice);
    setMaxPrice(initialState.maxPrice);
  }, [
    initialState.selectedTipos.join(','),
    initialState.selectedBairros.join(','),
    initialState.selectedCidades.join(','),
    initialState.selectedImobiliarias.join(','),
    initialState.selectedQuartos.join(','),
    initialState.selectedQuartosPlus,
    initialState.selectedSuites.join(','),
    initialState.selectedSuitesPlus,
    initialState.selectedBanheiros.join(','),
    initialState.selectedBanheirosPlus,
    initialState.selectedVagas.join(','),
    initialState.selectedVagasPlus,
    initialState.selectedComodidades.join(','),
    initialState.minPrice,
    initialState.maxPrice,
  ]);

  const getCurrentFilterState = (): AiSearcherFiltersState => ({
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
  });

  const applyFilters = () => {
    onFilterStateChange(getCurrentFilterState());
  };

  const handlePriceChange = (value: string, setter: (val: string) => void) => {
    const numericStr = value.replace(/\D/g, "");
    setter(numericStr);
  };

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

  // Apply filters (debounced)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      let filtered = [...properties];

      if (selectedTipos.length > 0) {
        filtered = filtered.filter((p) => selectedTipos.includes(p.tipo));
      }
      if (selectedBairros.length > 0) {
        filtered = filtered.filter((p) => selectedBairros.includes(p.bairro));
      }
      if (selectedCidades.length > 0) {
        filtered = filtered.filter((p) => selectedCidades.includes(p.cidade));
      }
      if (selectedImobiliarias.length > 0) {
        filtered = filtered.filter((p) =>
          selectedImobiliarias.includes(p.imobiliaria)
        );
      }
      if (selectedQuartos.length > 0 || selectedQuartosPlus) {
        filtered = filtered.filter((p) => {
          const exactMatch = selectedQuartos.length === 0 || selectedQuartos.includes(p.quartos);
          const plusMatch = selectedQuartosPlus && p.quartos >= 4;
          return exactMatch || plusMatch;
        });
      }
      if (selectedSuites.length > 0 || selectedSuitesPlus) {
        filtered = filtered.filter((p) => {
          const exactMatch = selectedSuites.length === 0 || selectedSuites.includes(p.suites);
          const plusMatch = selectedSuitesPlus && p.suites >= 4;
          return exactMatch || plusMatch;
        });
      }
      if (selectedBanheiros.length > 0 || selectedBanheirosPlus) {
        filtered = filtered.filter((p) => {
          const exactMatch = selectedBanheiros.length === 0 || selectedBanheiros.includes(p.banheiros);
          const plusMatch = selectedBanheirosPlus && p.banheiros >= 4;
          return exactMatch || plusMatch;
        });
      }
      if (selectedVagas.length > 0 || selectedVagasPlus) {
        filtered = filtered.filter((p) => {
          const exactMatch = selectedVagas.length === 0 || selectedVagas.includes(p.vagas);
          const plusMatch = selectedVagasPlus && p.vagas >= 4;
          return exactMatch || plusMatch;
        });
      }
      if (selectedComodidades.length > 0) {
        filtered = filtered.filter((p) =>
          selectedComodidades.every((key) => (p as any)[key] === true)
        );
      }
      if (minPrice) {
        const min = parseFloat(minPrice);
        if (!isNaN(min)) {
          filtered = filtered.filter((p) => p.preco >= min);
        }
      }
      if (maxPrice) {
        const max = parseFloat(maxPrice);
        if (!isNaN(max)) {
          filtered = filtered.filter((p) => p.preco <= max);
        }
      }

      onFilterChange(filtered);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
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
    properties,
    onFilterChange,
  ]);

  const handleToggle = <T,>(
    setter: React.Dispatch<React.SetStateAction<T[]>>,
    value: T,
    checked: boolean
  ) => {
    setter((prev) =>
      checked ? [...prev, value] : prev.filter((v) => v !== value)
    );
  };

  const clearFilters = () => {
    setSelectedTipos(EMPTY_FILTER_STATE.selectedTipos);
    setSelectedBairros(EMPTY_FILTER_STATE.selectedBairros);
    setSelectedCidades(EMPTY_FILTER_STATE.selectedCidades);
    setSelectedImobiliarias(EMPTY_FILTER_STATE.selectedImobiliarias);
    setSelectedQuartos(EMPTY_FILTER_STATE.selectedQuartos);
    setSelectedQuartosPlus(EMPTY_FILTER_STATE.selectedQuartosPlus);
    setSelectedSuites(EMPTY_FILTER_STATE.selectedSuites);
    setSelectedSuitesPlus(EMPTY_FILTER_STATE.selectedSuitesPlus);
    setSelectedBanheiros(EMPTY_FILTER_STATE.selectedBanheiros);
    setSelectedBanheirosPlus(EMPTY_FILTER_STATE.selectedBanheirosPlus);
    setSelectedVagas(EMPTY_FILTER_STATE.selectedVagas);
    setSelectedVagasPlus(EMPTY_FILTER_STATE.selectedVagasPlus);
    setSelectedComodidades(EMPTY_FILTER_STATE.selectedComodidades);
    setMinPrice(EMPTY_FILTER_STATE.minPrice);
    setMaxPrice(EMPTY_FILTER_STATE.maxPrice);
    setSearchTipo("");
    setSearchBairro("");
    setSearchCidade("");
    setSearchImobiliaria("");
    onFilterStateChange(EMPTY_FILTER_STATE);
  };

  return (
      <div className="bg-card rounded-xl border shadow-sm p-6 sticky top-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Filtros</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-primary hover:underline font-medium cursor-pointer"
          >
            Limpar
          </button>
        </div>

        <div className="space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto pr-2 pb-4">
          {/* Preço */}
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">Preço</h4>
            <div className="space-y-3">
              <div>
                <Label htmlFor="minPrice" className="text-sm text-muted-foreground">
                  Valor Mínimo
                </Label>
                <Input
                  id="minPrice"
                  type="text"
                  placeholder="R$ 0"
                  value={formatToBRL(minPrice)}
                  onChange={(e) => handlePriceChange(e.target.value, setMinPrice)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice" className="text-sm text-muted-foreground">
                  Valor Máximo
                </Label>
                <Input
                  id="maxPrice"
                  type="text"
                  placeholder="R$ 999.999"
                  value={formatToBRL(maxPrice)}
                  onChange={(e) => handlePriceChange(e.target.value, setMaxPrice)}
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
              handleToggle(setSelectedTipos, val, checked)
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
              handleToggle(setSelectedCidades, val, checked)
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
              handleToggle(setSelectedBairros, val, checked)
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
              handleToggle(setSelectedImobiliarias, val, checked)
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
            onToggle={(val) => handleToggle(setSelectedQuartos, val, !selectedQuartos.includes(val))}
            onPlusToggle={() => setSelectedQuartosPlus(!selectedQuartosPlus)}
          />

          {/* Suites */}
          <FixedRoomFilterSection
            title="Suítes"
            selectedItems={selectedSuites}
            selectedPlus={selectedSuitesPlus}
            idPrefix="suites"
            labelSuffix="suíte"
            onToggle={(val) => handleToggle(setSelectedSuites, val, !selectedSuites.includes(val))}
            onPlusToggle={() => setSelectedSuitesPlus(!selectedSuitesPlus)}
          />

          {/* Banheiros */}
          <FixedRoomFilterSection
            title="Banheiros"
            selectedItems={selectedBanheiros}
            selectedPlus={selectedBanheirosPlus}
            idPrefix="banheiros"
            labelSuffix="banheiro"
            onToggle={(val) => handleToggle(setSelectedBanheiros, val, !selectedBanheiros.includes(val))}
            onPlusToggle={() => setSelectedBanheirosPlus(!selectedBanheirosPlus)}
          />

          {/* Vagas */}
          <FixedRoomFilterSection
            title="Vagas"
            selectedItems={selectedVagas}
            selectedPlus={selectedVagasPlus}
            idPrefix="vagas"
            labelSuffix="vaga"
            onToggle={(val) => handleToggle(setSelectedVagas, val, !selectedVagas.includes(val))}
            onPlusToggle={() => setSelectedVagasPlus(!selectedVagasPlus)}
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
                                  handleToggle(setSelectedComodidades, key, checked as boolean)
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
        <div className="-mx-6 -mb-6 mt-4 border-t bg-card/95 px-6 py-4">
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
      <h4 className="font-semibold text-foreground mb-3 text-sm">
        {title}
      </h4>
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
