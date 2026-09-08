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
import { cn } from "@/lib/utils";
import {
  getMarketPropertyFilters,
  type MarketPropertyFiltersResponse,
} from "@/services/marketPropertyService";
import type { MarketAnalyticsFilters } from "@/types/analytics";
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

  const toggle = <TValue extends string | number>(list: TValue[], value: TValue): TValue[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

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

          <div className="space-y-2">
            <Label htmlFor="analytics-min-price">Preço</Label>
            <div className="flex gap-2">
              <Input
                id="analytics-min-price"
                inputMode="numeric"
                placeholder="Mínimo"
                value={filters.min}
                onChange={(event) => update({ min: event.target.value })}
              />
              <Input
                inputMode="numeric"
                placeholder="Máximo"
                value={filters.max}
                onChange={(event) => update({ max: event.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="analytics-min-area">Área (m²)</Label>
            <div className="flex gap-2">
              <Input
                id="analytics-min-area"
                inputMode="numeric"
                placeholder="Mínima"
                value={filters.area_min}
                onChange={(event) => update({ area_min: event.target.value })}
              />
              <Input
                inputMode="numeric"
                placeholder="Máxima"
                value={filters.area_max}
                onChange={(event) => update({ area_max: event.target.value })}
              />
            </div>
          </div>

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

        <ChipGroup
          label="Tipo de imóvel"
          values={options?.tipos ?? []}
          selected={filters.tipo}
          onToggle={(value) => update({ tipo: toggle(filters.tipo, value) })}
        />

        <ChipGroup
          label="Bairro"
          values={neighbourhoods}
          selected={filters.bairro}
          onToggle={(value) => update({ bairro: toggle(filters.bairro, value) })}
          limit={24}
        />

        <ChipGroup
          label="Imobiliária"
          values={options?.imobiliarias ?? []}
          selected={filters.imobiliaria}
          onToggle={(value) => update({ imobiliaria: toggle(filters.imobiliaria, value) })}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ChipGroup
            label="Quartos"
            values={BEDROOM_OPTIONS}
            selected={filters.quartos}
            renderLabel={(value) => (value === 5 ? "5+" : String(value))}
            onToggle={(value) => update({ quartos: toggle(filters.quartos, value) })}
          />
          <ChipGroup
            label="Vagas"
            values={PARKING_OPTIONS}
            selected={filters.vagas}
            renderLabel={(value) => (value === 3 ? "3+" : String(value))}
            onToggle={(value) => update({ vagas: toggle(filters.vagas, value) })}
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

interface ChipGroupProps<TValue extends string | number> {
  label: string;
  values: TValue[];
  selected: TValue[];
  onToggle: (value: TValue) => void;
  renderLabel?: (value: TValue) => string;
  limit?: number;
}

function ChipGroup<TValue extends string | number>({
  label,
  values,
  selected,
  onToggle,
  renderLabel,
  limit,
}: ChipGroupProps<TValue>) {
  if (values.length === 0) return null;

  const visible = limit === undefined ? values : values.slice(0, limit);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {visible.map((value) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => onToggle(value)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              selected.includes(value)
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input hover:bg-accent",
            )}
          >
            {renderLabel ? renderLabel(value) : String(value)}
          </button>
        ))}
      </div>
    </div>
  );
}
