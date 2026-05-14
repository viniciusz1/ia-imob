"use client";

import { useState } from "react";
import { Search, Loader2, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { AiSearchResponse, AiParsedFilter, SortMode } from "./types";
import api, { API_PREFIX } from "@/services/api";

function parseFiltersToLabels(filters: Record<string, unknown>): AiParsedFilter[] {
  const labels: AiParsedFilter[] = [];
  const labelMap: Record<string, string> = {
    tipo: "Tipo",
    bairro: "Bairro",
    bairro_fuzzy: "Bairro",
    cidade: "Cidade",
    cidade_fuzzy: "Cidade",
    locations: "Localização",
    proximity: "Perto de",
    imobiliaria: "Imobiliária",
    quartos: "Quartos",
    quartos_plus: "Quartos",
    suites: "Suítes",
    suites_plus: "Suítes",
    banheiros: "Banheiros",
    banheiros_plus: "Banheiros",
    vagas: "Vagas",
    vagas_plus: "Vagas",
    min: "Valor mínimo",
    max: "Valor máximo",
    piscina: "Piscina",
    churrasqueira: "Churrasqueira",
    academia: "Academia",
    salao_festas: "Salão de Festas",
    playground: "Playground",
    sacada: "Sacada",
    mobiliado: "Mobiliado",
    ar_condicionado: "Ar Condicionado",
    lavanderia: "Lavanderia",
    escritorio: "Escritório",
    closet: "Closet",
    elevador: "Elevador",
    portaria_24h: "Portaria 24h",
    aceita_permuta: "Aceita Permuta",
    financiamento: "Financiamento",
    sort: "Ordenação",
  };

  const formatValue = (key: string, value: unknown): string => {
    if (key === "locations" && Array.isArray(value)) {
      return value
        .map((item) => {
          if (!item || typeof item !== "object") return "";
          const location = item as { bairro?: string; cidade?: string };
          return [location.bairro, location.cidade].filter(Boolean).join(" - ");
        })
        .filter(Boolean)
        .join(" ou ");
    }
    if (key === "proximity" && value && typeof value === "object") {
      const proximity = value as { reference?: string; city?: string };
      return [proximity.reference, proximity.city].filter(Boolean).join(" - ");
    }
    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (key === "min" || key === "max") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(Number(value));
    }
    return String(value);
  };

  for (const [key, value] of Object.entries(filters)) {
    if (key === "bairro_fuzzy" || key === "cidade_fuzzy") {
      continue;
    }
    const label = labelMap[key];
    if (label) {
      labels.push({
        key,
        label,
        value: formatValue(key, value),
      });
    }
  }

  return labels;
}

interface AiPromptInputProps {
  onResults: (response: AiSearchResponse, prompt: string) => void;
  onLoadingChange: (loading: boolean) => void;
  isLoading: boolean;
  sort: SortMode;
  large?: boolean;
}

export function AiPromptInput({ onResults, onLoadingChange, isLoading, sort, large }: AiPromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [activeFilters, setActiveFilters] = useState<AiParsedFilter[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    onLoadingChange(true);

    try {
      const response = await api.post(`${API_PREFIX}/scrapy-properties/ai-search`, {
        prompt: trimmed,
        per_page: 21,
        sort,
      });

      const data: AiSearchResponse = response.data;
      setActiveFilters(parseFiltersToLabels(data.filters));
      onResults(data, trimmed);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string; message?: string } } };
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Erro ao processar a busca. Tente novamente.";
      setError(message);
    } finally {
      onLoadingChange(false);
    }
  }

  return (
    <div className={`w-full mx-auto space-y-4 ${large ? "max-w-4xl" : "max-w-2xl"}`}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label className="text-lg font-semibold text-foreground text-center block">
            Busque seu imóvel com IA
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Ex: "Apartamento de 3 quartos no bairro Amizade com piscina"'
              className={`w-full pl-10 pr-12 text-base ${large ? "h-16 text-lg" : "h-12"}`}
              disabled={isLoading}
            />
            {prompt && !isLoading && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 size-8 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
            {isLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </form>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Filtros interpretados pela IA:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="secondary" className="text-xs">
                <span className="font-medium">{f.label}:</span>
                <span className="ml-1 text-muted-foreground">{f.value}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
