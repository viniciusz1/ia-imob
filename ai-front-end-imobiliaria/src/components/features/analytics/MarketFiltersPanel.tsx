"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getMarketPropertyFilters,
  type MarketPropertyFiltersResponse,
} from "@/services/marketPropertyService";
import type { MarketAnalyticsFilters } from "@/types/analytics";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { NumberRangeField } from "./NumberRangeField";
import { formatAreaInput, formatCurrencyInput } from "./numberInput";
import { EMPTY_FILTERS } from "./useMarketAnalyticsFilters";

const ALL_CITIES = "__todas__";
const BEDROOM_OPTIONS = [0, 1, 2, 3, 4, 5];
const PARKING_OPTIONS = [0, 1, 2, 3];

/** Filters kept behind "Mais filtros"; the rest stay visible at all times. */
const SECONDARY_KEYS = [
  "area_min",
  "area_max",
  "data_inicio",
  "data_fim",
  "imobiliaria",
  "quartos",
  "vagas",
] as const;

interface MarketFiltersPanelProps {
  filters: MarketAnalyticsFilters;
  onChange: (filters: MarketAnalyticsFilters) => void;
}

function isActive(value: MarketAnalyticsFilters[keyof MarketAnalyticsFilters]): boolean {
  return Array.isArray(value) ? value.length > 0 : value !== "";
}

export function MarketFiltersPanel({ filters, onChange }: MarketFiltersPanelProps) {
  const [options, setOptions] = useState<MarketPropertyFiltersResponse | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);

  useEffect(() => {
    let active = true;

    getMarketPropertyFilters()
      .then((response) => {
        if (active) setOptions(response);
      })
      .catch(() => {
        if (active) setOptions(null);
      });

    return () => {
      active = false;
    };
  }, []);

  const neighbourhoods = useMemo(() => {
    if (options === null) return [];
    if (!filters.cidade) return options.bairros;

    return options.bairros_por_cidade[filters.cidade] ?? [];
  }, [options, filters.cidade]);

  // A filter hidden behind the toggle still narrows every number on the page,
  // so surface how many are on rather than letting them apply unseen.
  const hiddenActiveCount = SECONDARY_KEYS.filter((key) => isActive(filters[key])).length;
  const hasAnyFilter = Object.values(filters).some(isActive);

  const update = (patch: Partial<MarketAnalyticsFilters>) => onChange({ ...filters, ...patch });

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="analytics-city">Cidade</Label>
            <Select
              value={filters.cidade || ALL_CITIES}
              onValueChange={(value) =>
                update({ cidade: value === ALL_CITIES ? "" : value, bairro: [] })
              }
            >
              <SelectTrigger id="analytics-city" className="w-full">
                <SelectValue placeholder="Todas as cidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CITIES}>Todas as cidades</SelectItem>
                {options?.cidades.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <MultiSelectFilter
            label="Tipo de imóvel"
            placeholder="Todos os tipos"
            values={options?.tipos ?? []}
            selected={filters.tipo}
            onChange={(tipo) => update({ tipo })}
          />

          <NumberRangeField
            id="analytics-price"
            label="Preço"
            format={formatCurrencyInput}
            minValue={filters.min}
            maxValue={filters.max}
            minPlaceholder="Mínimo"
            maxPlaceholder="Máximo"
            onChange={(range) => update({ min: range.min, max: range.max })}
          />

          <MultiSelectFilter
            label="Bairro"
            placeholder="Todos os bairros"
            values={neighbourhoods}
            selected={filters.bairro}
            onChange={(bairro) => update({ bairro })}
          />
        </div>

        {showSecondary ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberRangeField
              id="analytics-area"
              label="Área"
              format={formatAreaInput}
              minValue={filters.area_min}
              maxValue={filters.area_max}
              minPlaceholder="Mínima"
              maxPlaceholder="Máxima"
              onChange={(range) => update({ area_min: range.min, area_max: range.max })}
            />

            <div className="space-y-2">
              <Label htmlFor="analytics-start-date">Período das coletas</Label>
              {/* Um campo de data nativo pede 152px para o indicador não cobrir
                  o texto, e dois lado a lado nesta coluna ficam com menos de
                  120px. Empilhados, cada um recebe a coluna inteira. */}
              <div className="flex flex-col gap-2">
                <Input
                  id="analytics-start-date"
                  aria-label="Data inicial das coletas"
                  className="min-w-0"
                  type="date"
                  value={filters.data_inicio}
                  onChange={(event) => update({ data_inicio: event.target.value })}
                />
                <Input
                  aria-label="Data final das coletas"
                  className="min-w-0"
                  type="date"
                  value={filters.data_fim}
                  onChange={(event) => update({ data_fim: event.target.value })}
                />
              </div>
            </div>

            <MultiSelectFilter
              label="Imobiliária"
              placeholder="Todas as imobiliárias"
              values={options?.imobiliarias ?? []}
              selected={filters.imobiliaria}
              onChange={(imobiliaria) => update({ imobiliaria })}
            />

            <MultiSelectFilter
              label="Quartos"
              placeholder="Qualquer quantidade"
              values={BEDROOM_OPTIONS}
              selected={filters.quartos}
              renderLabel={(value) => (value === 5 ? "5 ou mais" : String(value))}
              onChange={(quartos) => update({ quartos })}
            />

            <MultiSelectFilter
              label="Vagas"
              placeholder="Qualquer quantidade"
              values={PARKING_OPTIONS}
              selected={filters.vagas}
              renderLabel={(value) => (value === 3 ? "3 ou mais" : String(value))}
              onChange={(vagas) => update({ vagas })}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSecondary((open) => !open)}
            aria-expanded={showSecondary}
          >
            <ChevronDown
              aria-hidden
              className={cn("mr-2 h-4 w-4 transition-transform", showSecondary && "rotate-180")}
            />
            {showSecondary
              ? "Menos filtros"
              : `Mais filtros${hiddenActiveCount > 0 ? ` (${hiddenActiveCount})` : ""}`}
          </Button>

          {hasAnyFilter ? (
            <Button variant="outline" size="sm" onClick={() => onChange({ ...EMPTY_FILTERS })}>
              <X aria-hidden className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
