"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
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

interface MarketFiltersPanelProps {
  filters: MarketAnalyticsFilters;
  onChange: (filters: MarketAnalyticsFilters) => void;
}

export function MarketFiltersPanel({ filters, onChange }: MarketFiltersPanelProps) {
  const [options, setOptions] = useState<MarketPropertyFiltersResponse | null>(null);

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

  const update = (patch: Partial<MarketAnalyticsFilters>) => onChange({ ...filters, ...patch });

  return (
    <Card className="mb-6">
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <div className="flex gap-2">
              <Input
                id="analytics-start-date"
                type="date"
                value={filters.data_inicio}
                onChange={(event) => update({ data_inicio: event.target.value })}
              />
              <Input
                type="date"
                value={filters.data_fim}
                onChange={(event) => update({ data_fim: event.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <MultiSelectFilter
            label="Tipo de imóvel"
            placeholder="Todos os tipos"
            values={options?.tipos ?? []}
            selected={filters.tipo}
            onChange={(tipo) => update({ tipo })}
          />
          <MultiSelectFilter
            label="Bairro"
            placeholder="Todos os bairros"
            values={neighbourhoods}
            selected={filters.bairro}
            onChange={(bairro) => update({ bairro })}
          />
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

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onChange({ ...EMPTY_FILTERS })}>
            <X className="mr-2 h-4 w-4" />
            Limpar filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

