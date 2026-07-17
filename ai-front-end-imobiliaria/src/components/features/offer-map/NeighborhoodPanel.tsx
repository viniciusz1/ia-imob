"use client";

import { ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { NeighborhoodMetric, OfferMapCoverage } from "@/types/offerMap";

interface NeighborhoodPanelProps {
  neighborhood: NeighborhoodMetric;
  coverage: OfferMapCoverage;
  dataDate: string | null;
  sources: string[];
}

function formatCurrency(value: number | null): string {
  if (value === null) return "-";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function NeighborhoodPanel({
  neighborhood,
  coverage,
  dataDate,
  sources,
}: NeighborhoodPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{neighborhood.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md bg-muted p-2">
            <span className="text-muted-foreground">Anúncios</span>
            <p className="text-lg font-semibold">{neighborhood.count}</p>
          </div>
          <div className="rounded-md bg-muted p-2">
            <span className="text-muted-foreground">Participação</span>
            <p className="text-lg font-semibold">
              {neighborhood.city_share_percent}%
            </p>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Tipo predominante:</span>{" "}
            <Badge variant="outline">{neighborhood.predominant_type ?? "-"}</Badge>
          </p>
          <p>
            <span className="text-muted-foreground">Faixa de preço:</span>{" "}
            <Badge variant="outline">
              {neighborhood.predominant_price_range ?? "-"}
            </Badge>
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="font-medium">Distribuição por tipo</p>
          {neighborhood.type_distribution.map((item) => (
            <div key={item.type} className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">{item.type}</span>
              <span>
                {item.count} ({item.percent}%)
              </span>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Mediana:</span>{" "}
            {formatCurrency(neighborhood.median_price)}
          </p>
          <p>
            <span className="text-muted-foreground">P25 - P75:</span>{" "}
            {formatCurrency(neighborhood.p25_price)} -{" "}
            {formatCurrency(neighborhood.p75_price)}
          </p>
        </div>

        <div className="rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Qualidade da amostra</span>
            <Badge variant={neighborhood.sample_quality === "adequate" ? "secondary" : "outline"}>
              {neighborhood.sample_quality === "adequate"
                ? "Amostra adequada"
                : "Amostra insuficiente"}
            </Badge>
          </div>
          <p className="mt-2">{neighborhood.sample_size} anúncios no bairro</p>
          <p className="text-muted-foreground">
            Cobertura da cidade: {coverage.percent}%
          </p>
          <p className="text-muted-foreground">
            Atualização: {dataDate ? new Date(dataDate).toLocaleString("pt-BR") : "indisponível"}
          </p>
          <p className="text-muted-foreground">
            Fontes: {sources.length > 0 ? sources.join(", ") : "indisponíveis"}
          </p>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Perfil típico:</span>{" "}
            {neighborhood.typical_bedrooms ?? "-"} quartos,{" "}
            {neighborhood.typical_garage_spaces ?? "-"} vagas,{" "}
            {neighborhood.typical_area ?? "-"} m²
          </p>
        </div>

        {neighborhood.concentration && (
          <>
            <Separator />
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Concentração de{" "}
                  {neighborhood.concentration.type}:
                </span>{" "}
                <Badge
                  variant={
                    neighborhood.concentration.level === "above"
                      ? "default"
                      : neighborhood.concentration.level === "below"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {neighborhood.concentration.level === "above" && "Acima do padrão"}
                  {neighborhood.concentration.level === "below" && "Abaixo do padrão"}
                  {neighborhood.concentration.level === "neutral" && "Neutro"}
                  {neighborhood.concentration.level === "insufficient_sample" &&
                    "Amostra insuficiente"}
                </Badge>
              </p>
              {neighborhood.concentration.ratio !== null && (
                <p>
                  <span className="text-muted-foreground">Razão:</span>{" "}
                  {neighborhood.concentration.ratio.toFixed(2)}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                A razão compara a participação da tipologia no bairro com sua
                participação na cidade sob os mesmos filtros. Valores ≥ 1,25 ficam
                acima do padrão e valores ≤ 0,75 ficam abaixo.
              </p>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-medium">Anúncios</p>
          <div className="max-h-[240px] space-y-2 overflow-y-auto">
            {neighborhood.listings.map((listing) => (
              <div
                key={listing.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div className="truncate">
                  <p className="font-medium truncate">{listing.tipo}</p>
                  <p className="text-muted-foreground">
                    {formatCurrency(listing.valor)}
                  </p>
                </div>
                {listing.link && (
                  <Button variant="ghost" size="icon" asChild>
                    <a
                      href={listing.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Abrir anúncio original"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
