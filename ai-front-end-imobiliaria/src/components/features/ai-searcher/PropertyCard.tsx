"use client";

import { useState } from "react";
import {
  Home,
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
import { ImageWithFallback } from "./ImageWithFallback";
import type { AiSearcherProperty } from "./types";

interface PropertyCardProps {
  property: AiSearcherProperty;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
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

const COMODIDADE_PRIORITY = [
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
    (key) => (property as any)[key] === true
  );

  const visibleComodidades = showAllComodidades
    ? activeComodidades
    : activeComodidades.slice(0, MAX_COMODIDADES);

  const remaining = activeComodidades.length - MAX_COMODIDADES;

  return (
    <div className="group bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300 flex flex-col">
      {/* Imagem */}
      <div className="relative h-48 overflow-hidden">
        <ImageWithFallback
          src={property.image}
          alt={`${property.tipo} em ${property.bairro}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
          {property.tipo}
        </Badge>
      </div>

      {/* Conteúdo */}
      <div className="p-5 flex flex-col flex-1">
        {/* Preço */}
        <p className="text-2xl font-bold text-foreground mb-3">
          {formatPrice(property.preco)}
        </p>

        {/* Informações principais */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm truncate">
              {property.bairro} - {property.cidade}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm truncate">{property.imobiliaria}</span>
          </div>
        </div>

        {/* Características */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4 pb-4 border-b">
          {property.quartos > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <BedDouble className="w-4 h-4 text-primary" />
              <span className="text-sm">
                {property.quartos} {property.quartos === 1 ? "quarto" : "quartos"}
              </span>
            </div>
          )}

          {property.suites > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm">
                {property.suites} {property.suites === 1 ? "suíte" : "suítes"}
              </span>
            </div>
          )}

          {property.banheiros > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Bath className="w-4 h-4 text-sky-500" />
              <span className="text-sm">
                {property.banheiros} {property.banheiros === 1 ? "banh." : "banhs."}
              </span>
            </div>
          )}

          {property.vagas > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Car className="w-4 h-4 text-violet-500" />
              <span className="text-sm">
                {property.vagas} {property.vagas === 1 ? "vaga" : "vagas"}
              </span>
            </div>
          )}

          {property.area > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Maximize className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">{property.area}m²</span>
            </div>
          )}
        </div>

        {/* Descrição */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {property.descricao}
        </p>

        {/* Comodidades */}
        {activeComodidades.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {visibleComodidades.map((key) => {
              const Icon = COMODIDADE_ICONS[key];
              return (
                <Badge
                  key={key}
                  variant="secondary"
                  className="text-xs font-normal gap-1"
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {COMODIDADE_LABELS[key]}
                </Badge>
              );
            })}
            {!showAllComodidades && remaining > 0 && (
              <Badge
                variant="outline"
                className="text-xs font-normal cursor-pointer hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllComodidades(true);
                }}
              >
                +{remaining}
              </Badge>
            )}
            {showAllComodidades && remaining > 0 && (
              <Badge
                variant="outline"
                className="text-xs font-normal cursor-pointer hover:bg-accent"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAllComodidades(false);
                }}
              >
                ver menos
              </Badge>
            )}
          </div>
        )}

        {/* Spacer to push button to bottom */}
        <div className="flex-1" />

        {/* Botão */}
        <Button onClick={handleViewDetails} className="w-full cursor-pointer" variant="default">
          <Home className="w-4 h-4 mr-2" />
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
}
