"use client";

import { Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { OfferMapLayer, OfferMapResponse, NeighborhoodMetric } from "@/types/offerMap";

interface OfferMapListProps {
  data: OfferMapResponse;
  layer: OfferMapLayer;
  selected: string[];
  onToggle: (name: string) => void;
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function layerBadge(neighborhood: NeighborhoodMetric, layer: OfferMapLayer): string {
  switch (layer) {
    case "stock":
      return `${neighborhood.count} anúncios`;
    case "type":
      return neighborhood.predominant_type ?? "-";
    case "price":
      return neighborhood.predominant_price_range ?? "-";
    case "profile":
      return `${neighborhood.typical_bedrooms ?? "-"} qts / ${neighborhood.typical_area ?? "-"} m²`;
    case "concentration":
      return neighborhood.concentration?.level === "above"
        ? "Acima do padrão"
        : neighborhood.concentration?.level === "below"
          ? "Abaixo do padrão"
          : neighborhood.concentration?.level === "insufficient_sample"
            ? "Amostra insuficiente"
            : "Neutro";
    default:
      return "";
  }
}

export function OfferMapList({ data, layer, selected, onToggle }: OfferMapListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {data.city} ({data.total_count} anúncios)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.neighborhoods.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Nenhum bairro encontrado para os filtros selecionados.
          </p>
        )}

        {data.neighborhoods.map((neighborhood) => {
          const isSelected = selected.includes(neighborhood.name);

          return (
            <div
              key={neighborhood.name}
              className={`rounded-lg border p-4 transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{neighborhood.name}</span>
                    {neighborhood.original_name !== neighborhood.name && (
                      <span className="text-xs text-muted-foreground">
                        ({neighborhood.original_name})
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge variant="secondary">{layerBadge(neighborhood, layer)}</Badge>
                    <span className="text-muted-foreground">
                      {neighborhood.city_share_percent}% da cidade
                    </span>
                  </div>
                </div>

                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggle(neighborhood.name)}
                  disabled={!isSelected && selected.length >= 3}
                >
                  {isSelected ? (
                    <>
                      <Check className="mr-1 h-4 w-4" />
                      Selecionado
                    </>
                  ) : (
                    "Selecionar"
                  )}
                </Button>
              </div>

              <Separator className="my-3" />

              <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
                <div>
                  <span className="text-muted-foreground">Mediana:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(neighborhood.median_price)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">P25:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(neighborhood.p25_price)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">P75:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(neighborhood.p75_price)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Perfil:</span>{" "}
                  <span className="font-medium">
                    {neighborhood.typical_bedrooms ?? "-"} qts /{" "}
                    {neighborhood.typical_garage_spaces ?? "-"} vagas
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {data.unmapped_listings.length > 0 && (
          <div className="rounded-lg border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              {data.unmapped_listings.length} anúncio(s) não localizado(s) no mapa
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
