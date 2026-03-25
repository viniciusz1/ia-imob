"use client";

import { Home, MapPin, Building2, Maximize, BedDouble } from "lucide-react";
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

export function PropertyCard({ property }: PropertyCardProps) {
  const handleViewDetails = () => {
    window.open(property.link_imovel, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="group bg-card rounded-xl border shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300">
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
      <div className="p-5">
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
        <div className="flex items-center gap-4 mb-4 pb-4 border-b">
          {property.quartos > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <BedDouble className="w-4 h-4 text-primary" />
              <span className="text-sm">
                {property.quartos}{" "}
                {property.quartos === 1 ? "quarto" : "quartos"}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1 text-muted-foreground">
            <Maximize className="w-4 h-4 text-emerald-500" />
            <span className="text-sm">{property.areaPrivativa}m²</span>
          </div>
        </div>

        {/* Descrição */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {property.descricao}
        </p>

        {/* Botão */}
        <Button onClick={handleViewDetails} className="w-full" variant="default">
          <Home className="w-4 h-4 mr-2" />
          Ver Detalhes
        </Button>
      </div>
    </div>
  );
}
