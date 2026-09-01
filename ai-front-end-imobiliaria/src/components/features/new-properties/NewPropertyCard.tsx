import {
  Bath,
  BedDouble,
  Building2,
  Car,
  ExternalLink,
  ImageOff,
  MapPin,
  Maximize,
  Sparkles,
  TrendingDown,
} from "lucide-react";

import { ImageWithFallback } from "@/components/features/ai-searcher/ImageWithFallback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NewPropertyItem } from "@/types/newProperties";

interface NewPropertyCardProps {
  property: NewPropertyItem;
  publishedAt: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function opportunitySummary(property: NewPropertyItem): string | null {
  if (!property.is_opportunity) return null;
  if (property.opportunity_explanation) return property.opportunity_explanation;

  if (
    property.price_advantage_percentage !== null &&
    property.comparable_count > 0
  ) {
    const advantage = new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(property.price_advantage_percentage);

    return `${advantage}% abaixo da mediana de ${property.comparable_count} imóveis comparáveis`;
  }

  return "Preço por m² abaixo de imóveis semelhantes";
}

function propertyTitle(property: NewPropertyItem): string {
  const title = property.title?.trim();
  if (title) return title;

  const type = property.tipo || "Imóvel";
  const location = property.bairro || property.cidade;

  return location ? `${type} em ${location}` : type;
}

export function NewPropertyCard({ property, publishedAt }: NewPropertyCardProps) {
  const summary = opportunitySummary(property);
  const hasExternalLink = /^https?:\/\//i.test(property.link_imovel);

  return (
    <Card className="group h-full overflow-hidden py-0 transition-shadow hover:shadow-md">
      <div className="relative h-48 overflow-hidden bg-muted">
        {property.image ? (
          <ImageWithFallback
            src={property.image}
            alt={propertyTitle(property)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-10" aria-hidden="true" />
            <span className="sr-only">Imóvel sem imagem</span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {property.is_new && (
            <Badge className="gap-1 bg-sky-600 text-white hover:bg-sky-600">
              <Sparkles className="size-3" aria-hidden="true" />
              Novo
            </Badge>
          )}
          {property.is_opportunity && (
            <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
              <TrendingDown className="size-3" aria-hidden="true" />
              Oportunidade
            </Badge>
          )}
        </div>
      </div>

      <CardContent className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Building2 className="size-3.5" aria-hidden="true" />
            <span>{property.tipo || "Imóvel"}</span>
            {property.purpose && (
              <>
                <span aria-hidden="true">•</span>
                <span className="capitalize">{property.purpose}</span>
              </>
            )}
          </div>
          <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
            {propertyTitle(property)}
          </h3>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {[property.bairro, property.cidade].filter(Boolean).join(" — ") || "Localização não informada"}
            </span>
          </div>
        </div>

        <div>
          <p className="text-2xl font-bold">
            {property.preco > 0 ? formatCurrency(property.preco) : "Preço não informado"}
          </p>
          {property.price_per_square_meter !== null && (
            <p className="text-sm text-muted-foreground">
              {formatCurrency(property.price_per_square_meter)}/m²
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {property.quartos > 0 && (
            <span className="inline-flex items-center gap-1">
              <BedDouble className="size-4" aria-hidden="true" />
              {property.quartos} qto.
            </span>
          )}
          {property.banheiros > 0 && (
            <span className="inline-flex items-center gap-1">
              <Bath className="size-4" aria-hidden="true" />
              {property.banheiros} banh.
            </span>
          )}
          {property.vagas > 0 && (
            <span className="inline-flex items-center gap-1">
              <Car className="size-4" aria-hidden="true" />
              {property.vagas} vaga{property.vagas === 1 ? "" : "s"}
            </span>
          )}
          {property.area > 0 && (
            <span className="inline-flex items-center gap-1">
              <Maximize className="size-4" aria-hidden="true" />
              {property.area} m²
            </span>
          )}
        </div>

        {property.is_new && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
            <p className="text-sm font-medium">Por que é novo?</p>
            <p className="mt-1.5 text-xs leading-5">
              A identidade estável deste anúncio não apareceu em {property.history_snapshot_count}{" "}
              {property.history_snapshot_count === 1
                ? "snapshot publicado anterior"
                : "snapshots publicados anteriores"}{" "}
              da janela de 30 dias.
            </p>
          </div>
        )}

        {property.is_opportunity && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Custo-benefício</span>
              {property.opportunity_score !== null && (
                <Badge variant="outline" className="border-emerald-400 text-current">
                  Score {property.opportunity_score}/100
                </Badge>
              )}
            </div>
            {summary && <p className="mt-1.5 text-xs leading-5">{summary}</p>}
          </div>
        )}

        {property.descricao && (
          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {property.descricao}
          </p>
        )}

        <div className="mt-auto space-y-3 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Snapshot publicado em {formatDate(publishedAt)}
          </p>
          {hasExternalLink ? (
            <Button asChild className="w-full">
              <a href={property.link_imovel} target="_blank" rel="noreferrer">
                Ver anúncio original
                <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <Button type="button" className="w-full" disabled>
              Anúncio original indisponível
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
