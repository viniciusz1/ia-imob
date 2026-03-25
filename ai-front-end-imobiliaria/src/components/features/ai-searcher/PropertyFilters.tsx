"use client";

import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Search } from "lucide-react";
import type { AiSearcherProperty, AiSearcherFiltersState } from "./types";

interface PropertyFiltersProps {
  properties: AiSearcherProperty[];
  onFilterChange: (filtered: AiSearcherProperty[]) => void;
  initialState: AiSearcherFiltersState;
  onFilterStateChange: (state: AiSearcherFiltersState) => void;
}

export function PropertyFilters({
  properties,
  onFilterChange,
  initialState,
  onFilterStateChange,
}: PropertyFiltersProps) {
  // Filter states
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
  const [minPrice, setMinPrice] = useState<string>(initialState.minPrice);
  const [maxPrice, setMaxPrice] = useState<string>(initialState.maxPrice);

  // Search states for each category
  const [searchTipo, setSearchTipo] = useState<string>("");
  const [searchBairro, setSearchBairro] = useState<string>("");
  const [searchCidade, setSearchCidade] = useState<string>("");
  const [searchImobiliaria, setSearchImobiliaria] = useState<string>("");

  // Extract distinct options
  const tipos = Array.from(new Set(properties.map((p) => p.tipo))).sort();
  const bairros = Array.from(new Set(properties.map((p) => p.bairro))).sort();
  const cidades = Array.from(new Set(properties.map((p) => p.cidade))).sort();
  const imobiliarias = Array.from(
    new Set(properties.map((p) => p.imobiliaria))
  ).sort();
  const quartos = Array.from(
    new Set(properties.map((p) => p.quartos).filter((q) => q > 0))
  ).sort((a, b) => a - b);

  // Filter options by search
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
    setMinPrice(initialState.minPrice);
    setMaxPrice(initialState.maxPrice);
  }, [
    initialState.selectedTipos.join(','),
    initialState.selectedBairros.join(','),
    initialState.selectedCidades.join(','),
    initialState.selectedImobiliarias.join(','),
    initialState.selectedQuartos.join(','),
    initialState.minPrice,
    initialState.maxPrice,
  ]);

  // Notify parent about filter state changes (URL sync)
  useEffect(() => {
    const handler = setTimeout(() => {
      onFilterStateChange({
        selectedTipos,
        selectedBairros,
        selectedCidades,
        selectedImobiliarias,
        selectedQuartos,
        minPrice,
        maxPrice,
      });
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [
    selectedTipos.join(','),
    selectedBairros.join(','),
    selectedCidades.join(','),
    selectedImobiliarias.join(','),
    selectedQuartos.join(','),
    minPrice,
    maxPrice,
    onFilterStateChange,
  ]);

  // Currency helpers
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

  // Apply filters
  useEffect(() => {
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
    if (selectedQuartos.length > 0) {
      filtered = filtered.filter((p) => selectedQuartos.includes(p.quartos));
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
  }, [
    selectedTipos,
    selectedBairros,
    selectedCidades,
    selectedImobiliarias,
    selectedQuartos,
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
    setSelectedTipos([]);
    setSelectedBairros([]);
    setSelectedCidades([]);
    setSelectedImobiliarias([]);
    setSelectedQuartos([]);
    setMinPrice("");
    setMaxPrice("");
    setSearchTipo("");
    setSearchBairro("");
    setSearchCidade("");
    setSearchImobiliaria("");
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm p-6 sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filtros</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-primary hover:underline font-medium"
        >
          Limpar
        </button>
      </div>

      <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
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
        {quartos.length > 0 && (
          <div>
            <h4 className="font-semibold text-foreground mb-3 text-sm">
              Quartos
            </h4>
            <div className="space-y-2">
              {quartos.map((quarto) => (
                <div key={quarto} className="flex items-center space-x-2">
                  <Checkbox
                    id={`quartos-${quarto}`}
                    checked={selectedQuartos.includes(quarto)}
                    onCheckedChange={(checked) =>
                      handleToggle(setSelectedQuartos, quarto, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`quartos-${quarto}`}
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    {quarto === 1 ? "1 quarto" : `${quarto} quartos`}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Reusable filter section ---

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
