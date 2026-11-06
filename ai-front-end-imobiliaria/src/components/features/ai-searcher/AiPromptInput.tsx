"use client";

import { useId, useRef, useState } from "react";
import { ArrowUp, BedDouble, CircleAlert, Loader2, MapPin, Search, Sparkles, Wallet, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AI_SEARCHER_PAGE_SIZE, type AiSearchResponse, type AiParsedFilter, type SortMode } from "./types";
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

// Explains what the AI turns into filters; shown under the first search.
const PROMPT_TIPS: Array<{ title: string; description: string; icon: LucideIcon }> = [
  { title: "Tipo e localização", description: "Casa, apartamento, terreno; cidade e bairro citados no texto.", icon: MapPin },
  { title: "Cômodos e vagas", description: "Quartos, suítes, banheiros e vagas de garagem.", icon: BedDouble },
  { title: "Preço e comodidades", description: "Faixa de valor e itens como piscina, sacada ou elevador.", icon: Wallet },
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
        per_page: AI_SEARCHER_PAGE_SIZE,
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
      <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={inputId}
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder='Ex: "Apartamento de 3 quartos no bairro Amizade com piscina"'
        className="h-14 rounded-xl pr-36 pl-12 text-base data-[size=default]:h-14"
        disabled={isLoading || disabled}
      />
      {prompt.trim() && !isLoading && !disabled && (
        <Button
          type="submit"
          aria-label="Buscar com IA"
          className="absolute top-1/2 right-2 -translate-y-1/2"
        >
          <Sparkles />
          Buscar
          <ArrowUp className="hidden sm:block" />
        </Button>
      )}
      {isLoading && (
        <Loader2 className="absolute top-1/2 right-4 size-5 -translate-y-1/2 animate-spin text-primary" />
      )}
    </form>
  );

  const errorBanner = error && (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-left text-sm text-foreground">
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <p>{error}</p>
    </div>
  );

  if (large) {
    return (
      <Card className="gap-0 py-0">
        <div className="flex items-start gap-3 px-6 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6">
          <Sparkles aria-hidden="true" className="size-6 shrink-0 text-sidebar-highlight" strokeWidth={2} />
          <div className="min-w-0 space-y-2">
            <Label
              htmlFor={inputId}
              className="text-xl leading-6 font-semibold tracking-[-0.01em] text-foreground"
            >
              Busque seu imóvel com IA
            </Label>
            <p className="text-sm leading-4 font-semibold text-subtle">
              Descreva com suas palavras o imóvel que procura. A IA transforma o
              texto em filtros de tipo, localização, cômodos, preço e comodidades.
            </p>
          </div>
        </div>

        <div className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
          <div className="space-y-4">
            {searchForm}
            {errorBanner}
          </div>

          <div className="space-y-3">
            <p className="text-sm leading-4 font-semibold text-subtle">Experimente</p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={isLoading || disabled}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-muted px-3.5 py-2.5 text-sm text-foreground transition-colors outline-none hover:bg-secondary focus-visible:ring-[3px] focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
                >
                  <Search className="size-3.5 text-subtle" aria-hidden="true" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 border-t pt-6 md:grid-cols-3">
            {PROMPT_TIPS.map((tip) => (
              <div className="flex items-start gap-3 rounded-xl bg-muted p-4" key={tip.title}>
                <span className="flex shrink-0 items-center justify-center rounded-xl bg-primary/15 p-[9px] text-primary">
                  <tip.icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">{tip.title}</p>
                  <p className="text-[0.8125rem] leading-5 text-subtle">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-5 px-6 py-6 sm:px-8">
      <div className="flex items-center gap-3">
        <span className="hidden shrink-0 items-center justify-center rounded-xl bg-primary/15 p-[9px] text-primary sm:flex">
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
          <p className="text-sm leading-4 font-semibold text-subtle">
            Filtros interpretados pela IA
          </p>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="secondary" className="px-2.5 py-1 text-[0.8125rem] font-medium">
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
