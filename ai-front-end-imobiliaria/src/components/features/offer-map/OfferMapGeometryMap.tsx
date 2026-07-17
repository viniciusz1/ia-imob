"use client";

import { Map as MapIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  GeoJsonPosition,
  NeighborhoodGeometryFeature,
  NeighborhoodMetric,
  OfferMapLayer,
  OfferMapResponse,
} from "@/types/offerMap";

interface OfferMapGeometryMapProps {
  data: OfferMapResponse;
  layer: OfferMapLayer;
  selected: string[];
  onToggle: (name: string) => void;
}

interface Bounds {
  minLongitude: number;
  maxLongitude: number;
  minLatitude: number;
  maxLatitude: number;
}

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 560;
const PADDING = 24;
const CATEGORY_COLORS = ["#2563eb", "#7c3aed", "#0891b2", "#059669", "#d97706"];

function ringsForFeature(feature: NeighborhoodGeometryFeature): GeoJsonPosition[][] {
  return feature.geometry.type === "Polygon"
    ? feature.geometry.coordinates
    : feature.geometry.coordinates.flat();
}

function geometryBounds(features: NeighborhoodGeometryFeature[]): Bounds {
  const positions = features.flatMap((feature) => ringsForFeature(feature).flat());
  const longitudes = positions.map(([longitude]) => longitude);
  const latitudes = positions.map(([, latitude]) => latitude);

  return {
    minLongitude: Math.min(...longitudes),
    maxLongitude: Math.max(...longitudes),
    minLatitude: Math.min(...latitudes),
    maxLatitude: Math.max(...latitudes),
  };
}

function project([longitude, latitude]: GeoJsonPosition, bounds: Bounds): [number, number] {
  const longitudeSpan = Math.max(bounds.maxLongitude - bounds.minLongitude, Number.EPSILON);
  const latitudeSpan = Math.max(bounds.maxLatitude - bounds.minLatitude, Number.EPSILON);
  const x =
    PADDING +
    ((longitude - bounds.minLongitude) / longitudeSpan) *
      (VIEWBOX_WIDTH - PADDING * 2);
  const y =
    PADDING +
    ((bounds.maxLatitude - latitude) / latitudeSpan) *
      (VIEWBOX_HEIGHT - PADDING * 2);

  return [x, y];
}

function pathForFeature(feature: NeighborhoodGeometryFeature, bounds: Bounds): string {
  return ringsForFeature(feature)
    .map((ring) =>
      ring
        .map((position, index) => {
          const [x, y] = project(position, bounds);
          return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ") + " Z",
    )
    .join(" ");
}

function categoryColor(value: string | number | null): string {
  if (value === null) return "#cbd5e1";

  const hash = String(value)
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length];
}

function metricColor(metric: NeighborhoodMetric | undefined, layer: OfferMapLayer): string {
  if (!metric) return "#e2e8f0";

  if (layer === "stock") {
    if (metric.city_share_percent >= 30) return "#1d4ed8";
    if (metric.city_share_percent >= 15) return "#3b82f6";
    if (metric.city_share_percent >= 5) return "#93c5fd";
    return "#dbeafe";
  }

  if (layer === "type") return categoryColor(metric.predominant_type);
  if (layer === "price") return categoryColor(metric.predominant_price_range);
  if (layer === "profile") return categoryColor(metric.typical_bedrooms);

  const level = metric.concentration?.level;
  if (level === "above") return "#15803d";
  if (level === "below") return "#b91c1c";
  if (level === "neutral") return "#64748b";

  return "#cbd5e1";
}

function metricLabel(metric: NeighborhoodMetric | undefined, layer: OfferMapLayer): string {
  if (!metric) return "Sem anúncios para os filtros atuais";

  if (layer === "stock") {
    return `${metric.count} anúncios (${metric.city_share_percent}% da cidade)`;
  }
  if (layer === "type") return metric.predominant_type ?? "Perfil misto";
  if (layer === "price") return metric.predominant_price_range ?? "Sem faixa predominante";
  if (layer === "profile") {
    return `${metric.typical_bedrooms ?? "-"} quartos, ${metric.typical_garage_spaces ?? "-"} vagas`;
  }

  return metric.concentration?.level === "above"
    ? "Concentração acima do padrão da cidade"
    : metric.concentration?.level === "below"
      ? "Concentração abaixo do padrão da cidade"
      : metric.concentration?.level === "insufficient_sample"
        ? "Amostra insuficiente"
        : "Concentração neutra";
}

export function OfferMapGeometryMap({
  data,
  layer,
  selected,
  onToggle,
}: OfferMapGeometryMapProps) {
  if (!data.geometry.available || data.geometry.features.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-44 flex-col items-center justify-center gap-2 text-center">
          <MapIcon className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Cidade sem geometria configurada</p>
          <p className="max-w-lg text-sm text-muted-foreground">
            A lista abaixo mantém as mesmas métricas e filtros, sem depender de polígonos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const bounds = geometryBounds(data.geometry.features);
  const metricsByName = new Map(
    data.neighborhoods.map((neighborhood) => [neighborhood.name, neighborhood]),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg">Mapa interativo por bairro</CardTitle>
        <Badge variant="outline">Geometria v{data.geometry.version}</Badge>
      </CardHeader>
      <CardContent>
        <svg
          aria-label={`Mapa de oferta de ${data.city}`}
          className="h-auto w-full rounded-lg border bg-slate-50"
          role="group"
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
        >
          {data.geometry.features.map((feature) => {
            const name = feature.properties.name;
            const metric = metricsByName.get(name);
            const isSelected = selected.includes(name);

            return (
              <path
                key={name}
                aria-label={`${name}: ${metricLabel(metric, layer)}`}
                aria-disabled={!metric}
                className={
                  metric
                    ? "cursor-pointer transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
                    : "cursor-default"
                }
                d={pathForFeature(feature, bounds)}
                fill={metricColor(metric, layer)}
                fillRule="evenodd"
                onClick={metric ? () => onToggle(name) : undefined}
                onKeyDown={(event) => {
                  if (metric && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onToggle(name);
                  }
                }}
                role={metric ? "button" : undefined}
                stroke={isSelected ? "#0f172a" : "#ffffff"}
                strokeWidth={isSelected ? 5 : 2}
                tabIndex={metric ? 0 : undefined}
              >
                <title>{`${name}: ${metricLabel(metric, layer)}`}</title>
              </path>
            );
          })}
        </svg>

        {data.geometry.source && (
          <p className="mt-2 text-xs text-muted-foreground">
            Limites: {data.geometry.source.name} ({data.geometry.source.license})
          </p>
        )}
      </CardContent>
    </Card>
  );
}
