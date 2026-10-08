"use client";

import { useState } from "react";
import {
  ExternalLink,
  MapPin,
  Building2,
  Maximize,
  BedDouble,
  Crown,
  Bath,
  Car,
  Waves,
  Flame,
  Dumbbell,
  PartyPopper,
  Baby,
  MonitorUp,
  Armchair,
  Snowflake,
  Shirt,
  Briefcase,
  DoorOpen,
  ArrowUpDown,
  ShieldCheck,
  Handshake,
  Banknote,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageWithFallback } from "./ImageWithFallback";
import type { AiSearcherProperty } from "./types";

interface PropertyCardProps {
  property: AiSearcherProperty;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(price);

const COMODIDADE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  piscina: Waves,
  churrasqueira: Flame,
  academia: Dumbbell,
  salao_festas: PartyPopper,
  playground: Baby,
  sacada: MonitorUp,
  mobiliado: Armchair,
  ar_condicionado: Snowflake,
  lavanderia: Shirt,
  escritorio: Briefcase,
  closet: DoorOpen,
  elevador: ArrowUpDown,
  portaria_24h: ShieldCheck,
  aceita_permuta: Handshake,
  financiamento: Banknote,
};

const COMODIDADE_PRIORITY: (keyof AiSearcherProperty)[] = [
  "piscina",
  "elevador",
  "churrasqueira",
  "mobiliado",
  "ar_condicionado",
  "academia",
  "portaria_24h",
  "salao_festas",
  "playground",
  "lavanderia",
  "sacada",
  "escritorio",
  "closet",
  "aceita_permuta",
  "financiamento",
];

const COMODIDADE_LABELS: Record<string, string> = {
  piscina: "Piscina",
  churrasqueira: "Churrasqueira",
  academia: "Academia",
  salao_festas: "Salão",
  playground: "Playground",
  sacada: "Sacada",
  mobiliado: "Mobiliado",
  ar_condicionado: "Ar Cond.",
  lavanderia: "Lavanderia",
  escritorio: "Escritório",
  closet: "Closet",
  elevador: "Elevador",
  portaria_24h: "Portaria 24h",
  aceita_permuta: "Permuta",
  financiamento: "Financia.",
};

const MAX_COMODIDADES = 5;

export function PropertyCard({ property }: PropertyCardProps) {
  const [showAllComodidades, setShowAllComodidades] = useState(false);

  const handleViewDetails = () => {
    window.open(property.link_imovel, "_blank", "noopener,noreferrer");
  };

  const activeComodidades = COMODIDADE_PRIORITY.filter(
    (key) => property[key] === true
  );

  const visibleComodidades = showAllComodidades
    ? activeComodidades
    : activeComodidades.slice(0, MAX_COMODIDADES);

  const remaining = activeComodidades.length - MAX_COMODIDADES;

  const attributes = [
    {
      key: "quartos",
      icon: BedDouble,
      value: property.quartos,
      label: property.quartos === 1 ? "quarto" : "quartos",
    },
    {
      key: "suites",
      icon: Crown,
      value: property.suites,
      label: property.suites === 1 ? "suíte" : "suítes",
    },
    {
      key: "banheiros",
      icon: Bath,
      value: property.banheiros,
      label: property.banheiros === 1 ? "banh." : "banhs.",
    },
    {
      key: "vagas",
      icon: Car,
      value: property.vagas,
      label: property.vagas === 1 ? "vaga" : "vagas",
    },
    {
      key: "area",
      icon: Maximize,
      value: property.area,
      label: "m²",
    },
  ].filter((attribute) => attribute.value > 0);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary/30">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <ImageWithFallback
          src={property.image}
          alt={`${property.tipo} em ${property.bairro}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {property.tipo && (
          <Badge className="absolute top-3 left-3 shadow-xs">
            {property.tipo}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-1.5">
          <p className="text-xl tracking-tight text-foreground tabular-nums">
            {formatPrice(property.preco)}
          </p>
          <p className="flex items-center gap-1.5 text-sm text-foreground">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {property.bairro} - {property.cidade}
            </span>
          </p>
          {property.imobiliaria && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="size-3.5 shrink-0" />
              <span className="truncate">{property.imobiliaria}</span>
            </p>
          )}
        </div>

        {attributes.length > 0 && (
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y py-3 text-sm text-foreground">
            {attributes.map(({ key, icon: Icon, value, label }) => (
              <li key={key} className="flex items-center gap-1.5">
                <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="tabular-nums">
                  {key === "area" ? `${value}${label}` : `${value} ${label}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        {property.descricao && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {property.descricao}
          </p>
        )}

        {activeComodidades.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {visibleComodidades.map((key) => {
              const Icon = COMODIDADE_ICONS[key];
              return (
                <Badge key={key} variant="muted">
                  {Icon && <Icon />}
                  {COMODIDADE_LABELS[key]}
                </Badge>
              );
            })}
            {remaining > 0 && (
              <Badge asChild variant="outline">
                <button
                  type="button"
                  className="cursor-pointer hover:bg-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllComodidades((current) => !current);
                  }}
                >
                  {showAllComodidades ? "ver menos" : `+${remaining}`}
                </button>
              </Badge>
            )}
          </div>
        )}

        <Button onClick={handleViewDetails} className="mt-auto w-full" variant="outline">
          <ExternalLink />
          Ver Detalhes
        </Button>
      </div>
    </article>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}
