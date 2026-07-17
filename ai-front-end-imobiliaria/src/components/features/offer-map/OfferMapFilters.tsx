"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OfferMapFilters } from "@/types/offerMap";

interface OfferMapFiltersProps {
  filters: OfferMapFilters;
  onChange: (filters: Partial<OfferMapFilters>) => void;
}

const PROPERTY_TYPES = [
  "Casa",
  "Apartamento",
  "Geminado",
  "Terreno",
  "Sala Comercial",
] as const;

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : Number(raw));
        }}
        placeholder="-"
      />
    </div>
  );
}

export function OfferMapFilters({ filters, onChange }: OfferMapFiltersProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="city" className="text-xs text-muted-foreground">
            Cidade
          </Label>
          <Input
            id="city"
            value={filters.city}
            onChange={(e) => onChange({ city: e.target.value })}
            placeholder="Ex: Jaraguá do Sul"
          />
        </div>

        <NumberInput
          label="Preço mínimo"
          value={filters.min_price}
          onChange={(value) => onChange({ min_price: value })}
        />

        <NumberInput
          label="Preço máximo"
          value={filters.max_price}
          onChange={(value) => onChange({ max_price: value })}
        />

        <NumberInput
          label="Área mínima"
          value={filters.min_area}
          onChange={(value) => onChange({ min_area: value })}
        />

        <NumberInput
          label="Área máxima"
          value={filters.max_area}
          onChange={(value) => onChange({ max_area: value })}
        />

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Tipo de imóvel</Label>
          <div className="flex flex-wrap gap-1">
            {PROPERTY_TYPES.map((type) => (
              <Button
                key={type}
                type="button"
                variant={filters.tipo?.includes(type) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const current = filters.tipo ?? [];
                  const next = current.includes(type)
                    ? current.filter((item) => item !== type)
                    : [...current, type];
                  onChange({ tipo: next });
                }}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Quartos</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((value) => (
              <Button
                key={value}
                type="button"
                variant={
                  filters.quartos?.includes(value) ? "default" : "outline"
                }
                size="sm"
                onClick={() => {
                  const current = filters.quartos ?? [];
                  const next = current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value];
                  onChange({ quartos: next });
                }}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Vagas</Label>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((value) => (
              <Button
                key={value}
                type="button"
                variant={
                  filters.vagas?.includes(value) ? "default" : "outline"
                }
                size="sm"
                onClick={() => {
                  const current = filters.vagas ?? [];
                  const next = current.includes(value)
                    ? current.filter((v) => v !== value)
                    : [...current, value];
                  onChange({ vagas: next });
                }}
              >
                {value}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
