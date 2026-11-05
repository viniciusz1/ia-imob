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
import type { NewPropertyItem } from "@/types/newProperties";

interface NewPropertyCardProps {
  property: NewPropertyItem;
}

/** Formata o valor em reais, sem centavos. */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Resume em linguagem simples por que o anúncio é uma oportunidade. */
function opportunitySummary(property: NewPropertyItem): string | null {
  if (!property.is_opportunity) return null;

  if (property.price_advantage_percentage !== null) {
    const advantage = new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(property.price_advantage_percentage);

    return `${advantage}% abaixo da referência de imóveis parecidos.`;
  }

  return "Preço por m² abaixo da referência de imóveis parecidos.";
}

/** Usa o título do anúncio ou monta um com o tipo e a localização. */
function propertyTitle(property: NewPropertyItem): string {
  const title = property.title?.trim();
  if (title) return title;

  const type = property.tipo || "Imóvel";
  const location = property.bairro || property.cidade;

  return location ? `${type} em ${location}` : type;
}

/**
 * Card de um anúncio, com foto, selos, preço, características e score.
 * Cada dado que a fonte não informou tem um texto próprio ou fica de fora do card.
 */
export function NewPropertyCard({ property }: NewPropertyCardProps) {
  const summary = opportunitySummary(property);
  // Só mostra o botão de link quando o endereço é válido.
  const hasExternalLink = /^https?:\/\//i.test(property.link_imovel);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-muted transition-colors duration-200 hover:bg-secondary/70">
      <div className="relative h-52 overflow-hidden bg-secondary">
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

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          {property.is_new && (
            <Badge className="gap-1 bg-info text-info-foreground hover:bg-info">
              <Sparkles className="size-3" aria-hidden="true" />
              Novo
            </Badge>
          )}
          {property.is_opportunity && (
            <Badge className="gap-1 bg-success text-success-foreground hover:bg-success">
              <TrendingDown className="size-3" aria-hidden="true" />
              Oportunidade
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[0.8125rem] text-subtle">
            <Building2 className="size-3.5" aria-hidden="true" />
            <span>{property.tipo || "Imóvel"}</span>
            {property.purpose && (
              <>
                <span aria-hidden="true">•</span>
                <span className="capitalize">{property.purpose}</span>
              </>
            )}
          </div>
          <h3 className="line-clamp-2 text-base leading-5 font-semibold">
            {propertyTitle(property)}
          </h3>
          <div className="flex items-center gap-1.5 text-[0.8125rem] text-subtle">
            <MapPin className="size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {[property.bairro, property.cidade].filter(Boolean).join(" — ") || "Localização não informada"}
            </span>
          </div>
        </div>

        <div>
          <p className="text-xl leading-7 font-semibold tracking-[-0.01em]">
            {property.preco > 0 ? formatCurrency(property.preco) : "Preço não informado"}
          </p>
          {property.price_per_square_meter !== null && (
            <p className="text-[0.8125rem] text-subtle">
              {formatCurrency(property.price_per_square_meter)}/m²
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[0.8125rem] text-subtle">
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

        {property.is_opportunity && (
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-foreground">
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
                <TrendingDown className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">Boa oportunidade</span>
                  {property.opportunity_score !== null && (
                    <Badge variant="outline" className="shrink-0 border-success/50 bg-transparent text-success">
                      Score {property.opportunity_score}/100
                    </Badge>
                  )}
                </div>
                {summary && <p className="mt-1 text-xs leading-5 text-muted-foreground">{summary}</p>}
              </div>
            </div>
          </div>
        )}

        {property.descricao && (
          <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">
            {property.descricao}
          </p>
        )}

        <div className="mt-auto border-t pt-4">
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
      </div>
    </article>
  );
}
