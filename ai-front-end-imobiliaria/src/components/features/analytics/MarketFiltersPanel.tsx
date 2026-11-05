"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
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
  type MarketPropertyFiltersQuery,
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

function buildAnalyticsFiltersQuery(
  filters: MarketAnalyticsFilters
): MarketPropertyFiltersQuery | undefined {
  const query: MarketPropertyFiltersQuery = {};

  if (filters.cidade) query.cidade = [filters.cidade];
  if (filters.bairro.length > 0) query.bairro = filters.bairro;
  if (filters.tipo.length > 0) query.tipo = filters.tipo;
  if (filters.imobiliaria.length > 0) query.imobiliaria = filters.imobiliaria;

  const exactBedrooms = filters.quartos.filter((q) => q < 5);
  if (exactBedrooms.length > 0) query.quartos = exactBedrooms;
  if (filters.quartos.includes(5)) query.quartos_plus = true;

  const exactParking = filters.vagas.filter((v) => v < 3);
  if (exactParking.length > 0) query.vagas = exactParking;
  if (filters.vagas.includes(3)) query.vagas_plus = true;

  if (filters.min) query.min = filters.min;
  if (filters.max) query.max = filters.max;
  if (filters.area_min) query.area_min = filters.area_min;
  if (filters.area_max) query.area_max = filters.area_max;
  if (filters.data_inicio) query.data_inicio = filters.data_inicio;
  if (filters.data_fim) query.data_fim = filters.data_fim;

  return Object.keys(query).length > 0 ? query : undefined;
}

function pruneAnalyticsFilters(
  current: MarketAnalyticsFilters,
  response: MarketPropertyFiltersResponse
): MarketAnalyticsFilters {
  const cidade =
    current.cidade && response.cidades.length > 0 && !response.cidades.includes(current.cidade)
      ? ""
      : current.cidade;

  const validBairros =
    !cidade || Object.keys(response.bairros_por_cidade).length === 0
      ? response.bairros
      : response.bairros_por_cidade[cidade] ?? [];

  const bairro = current.bairro.filter((b) => validBairros.includes(b));
  const tipo =
    response.tipos.length > 0 || response.comodidades !== undefined
      ? current.tipo.filter((t) => response.tipos.includes(t))
      : current.tipo;
  const imobiliaria = current.imobiliaria.filter((i) => response.imobiliarias.includes(i));

  return {
    ...current,
    cidade,
    bairro,
    tipo,
    imobiliaria,
  };
}

export function MarketFiltersPanel({ filters, onChange }: MarketFiltersPanelProps) {
  const [options, setOptions] = useState<MarketPropertyFiltersResponse | null>(null);
  const [showSecondary, setShowSecondary] = useState(false);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    let active = true;
    const query = buildAnalyticsFiltersQuery(filters);

    getMarketPropertyFilters(query)
      .then((response) => {
        if (!active) return;
        setOptions(response);
        const pruned = pruneAnalyticsFilters(filters, response);
        if (JSON.stringify(pruned) !== filtersKey) {
          onChange(pruned);
        }
      })
      .catch(() => {
        if (active) setOptions(null);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const neighbourhoods = useMemo(() => {
    if (options === null) return [];
    if (!filters.cidade || Object.keys(options.bairros_por_cidade).length === 0) {
      return options.bairros;
    }

    return options.bairros_por_cidade[filters.cidade] ?? [];
  }, [options, filters.cidade]);

  const bedroomOptions = useMemo(() => {
    if (!options || (options.quartos.length === 0 && options.comodidades === undefined)) {
      return BEDROOM_OPTIONS;
    }
    const buckets = new Set<number>();
    for (const count of options.quartos) {
      buckets.add(count >= 5 ? 5 : count);
    }
    return BEDROOM_OPTIONS.filter((opt) => buckets.has(opt));
  }, [options]);

  const parkingOptions = useMemo(() => {
    if (!options || (options.vagas.length === 0 && options.comodidades === undefined)) {
      return PARKING_OPTIONS;
    }
    const buckets = new Set<number>();
    for (const count of options.vagas) {
      buckets.add(count >= 3 ? 3 : count);
    }
    return PARKING_OPTIONS.filter((opt) => buckets.has(opt));
  }, [options]);

  // A filter hidden behind the toggle still narrows every number on the page,
  // so surface how many are on rather than letting them apply unseen.
  const hiddenActiveCount = SECONDARY_KEYS.filter((key) => isActive(filters[key])).length;
  const hasAnyFilter = Object.values(filters).some(isActive);

  const update = (patch: Partial<MarketAnalyticsFilters>) => onChange({ ...filters, ...patch });

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <SectionHeader
        actions={
          hasAnyFilter ? (
            <Button variant="ghost" size="sm" onClick={() => onChange({ ...EMPTY_FILTERS })}>
              <RotateCcw aria-hidden />
              Limpar filtros
            </Button>
          ) : null
        }
        description="Os filtros valem para todos os indicadores da página."
        icon={SlidersHorizontal}
        title="Filtros"
      />

      <div className="space-y-4 px-6 pb-6 sm:px-8 sm:pb-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FormField htmlFor="analytics-city" label="Cidade">
            <Select
              value={filters.cidade || ALL_CITIES}
              onValueChange={(value) =>
                update({ cidade: value === ALL_CITIES ? "" : value, bairro: [] })
              }
            >
              <SelectTrigger id="analytics-city" className="w-full" size="sm">
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
          </FormField>

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
          <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2 xl:grid-cols-4">
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

            <FormField htmlFor="analytics-start-date" label="Período das coletas">
              <div className="grid grid-cols-2 gap-2">
                <DatePicker
                  id="analytics-start-date"
                  aria-label="Data inicial das coletas"
                  placeholder="De"
                  size="sm"
                  value={filters.data_inicio}
                  onChange={(value) => update({ data_inicio: value })}
                />
                <DatePicker
                  aria-label="Data final das coletas"
                  placeholder="Até"
                  size="sm"
                  value={filters.data_fim}
                  onChange={(value) => update({ data_fim: value })}
                />
              </div>
            </FormField>

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
              values={bedroomOptions}
              selected={filters.quartos}
              renderLabel={(value) => (value === 5 ? "5 ou mais" : String(value))}
              onChange={(quartos) => update({ quartos })}
            />

            <MultiSelectFilter
              label="Vagas"
              placeholder="Qualquer quantidade"
              values={parkingOptions}
              selected={filters.vagas}
              renderLabel={(value) => (value === 3 ? "3 ou mais" : String(value))}
              onChange={(vagas) => update({ vagas })}
            />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSecondary((open) => !open)}
            aria-expanded={showSecondary}
          >
            <ChevronDown
              aria-hidden
              className={cn("transition-transform", showSecondary && "rotate-180")}
            />
            {showSecondary
              ? "Menos filtros"
              : `Mais filtros${hiddenActiveCount > 0 ? ` (${hiddenActiveCount})` : ""}`}
          </Button>
        </div>
      </div>
    </Card>
  );
}
