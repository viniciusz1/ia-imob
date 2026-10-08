"use client";

import { useId, useRef, useState } from "react";
import { ArrowUp, CircleAlert, Loader2, Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEFAULT_PAGE_SIZE } from "@/components/layout/PaginationFooter";
import type { AiSearchResponse, AiParsedFilter, SortMode } from "./types";
import api, { API_PREFIX } from "@/services/api";
import {
  getMarketSearchErrorMessage,
  isMarketSearchAllowanceExceeded,
} from "./marketSearchError";

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

const PROMPT_SUGGESTIONS = [
  "Apartamento de 2 quartos com sacada",
  "Casa com piscina e churrasqueira",
  "Imóvel até R$ 500 mil com 2 vagas",
  "Apartamento mobiliado com elevador",
];

interface AiPromptInputProps {
  onResults: (response: AiSearchResponse, prompt: string) => void;
  onLoadingChange: (loading: boolean) => void;
  isLoading: boolean;
  sort: SortMode;
  large?: boolean;
  disabled?: boolean;
  onAllowanceExhausted?: (message: string) => void;
}

export function AiPromptInput({
  onResults,
  onLoadingChange,
  isLoading,
  sort,
  large,
  disabled = false,
  onAllowanceExhausted,
}: AiPromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [activeFilters, setActiveFilters] = useState<AiParsedFilter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = prompt.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    onLoadingChange(true);

    try {
      const response = await api.post(`${API_PREFIX}/market-properties/ai-search`, {
        prompt: trimmed,
        per_page: DEFAULT_PAGE_SIZE,
        sort,
      });

      const data: AiSearchResponse = response.data;
      setActiveFilters(parseFiltersToLabels(data.filters));
      onResults(data, trimmed);
    } catch (err: unknown) {
      const message = getMarketSearchErrorMessage(err);
      setError(message);
      if (isMarketSearchAllowanceExceeded(err)) {
        onAllowanceExhausted?.(message);
      }
    } finally {
      onLoadingChange(false);
    }
  }

  function handleSuggestionClick(suggestion: string) {
    setPrompt(suggestion);
    inputRef.current?.focus();
  }

  const searchForm = (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={inputId}
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='Ex: "Apartamento de 3 quartos no bairro Amizade com piscina"'
        className="pr-12 pl-9"
        disabled={isLoading || disabled}
      />
      {prompt && !isLoading && !disabled && (
        <Button
          type="submit"
          size="icon-sm"
          aria-label="Buscar com IA"
          className="absolute top-1/2 right-1 -translate-y-1/2"
        >
          <ArrowUp />
        </Button>
      )}
      {isLoading && (
        <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </form>
  );

  const errorBanner = error && (
    <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-left text-sm text-foreground">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p>{error}</p>
    </div>
  );

  if (large) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-primary/20 bg-primary/5 px-5 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </span>
          <Label
            htmlFor={inputId}
            className="mt-4 text-xl tracking-tight text-foreground"
          >
            Busque seu imóvel com IA
          </Label>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            Descreva com suas palavras o imóvel que procura. A IA transforma o
            texto em filtros de tipo, localização, cômodos, preço e comodidades.
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {searchForm}
          {errorBanner}
        </div>

        <div className="mt-6 space-y-2.5">
          <p className="text-center text-xs tracking-wide text-muted-foreground uppercase">
            Experimente
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isLoading || disabled}
                className="cursor-pointer rounded-full border bg-card px-3 py-1.5 text-sm text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <Card className="gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:flex">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <Label htmlFor={inputId} className="sr-only">
            Busque seu imóvel com IA
          </Label>
          {searchForm}
        </div>
      </div>

      {errorBanner}

      {activeFilters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Filtros interpretados pela IA
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="outline" className="bg-card">
                <span className="text-muted-foreground">{f.label}:</span>
                <span>{f.value}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
