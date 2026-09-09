"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  CircleAlert,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
} from "lucide-react";

import { NewPropertyCard } from "./NewPropertyCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getNewProperties } from "@/services/newPropertiesService";
import type {
  NewPropertyAgencyGroup,
  NewPropertyFlagFilter,
  NewPropertyItem,
} from "@/types/newProperties";

const FILTERS: Array<{ value: NewPropertyFlagFilter; label: string }> = [
  { value: "all", label: "Todos os imóveis" },
  { value: "new", label: "Novidades" },
  { value: "opportunity", label: "Oportunidades" },
  { value: "both", label: "Novidades com oportunidade" },
];

function matchesFilter(property: NewPropertyItem, filter: NewPropertyFlagFilter): boolean {
  if (filter === "new") return property.is_new;
  if (filter === "opportunity") return property.is_opportunity;
  if (filter === "both") return property.is_new && property.is_opportunity;

  return true;
}

function NewPropertiesSkeleton() {
  return (
    <div className="space-y-6" aria-label="Carregando novos imóveis">
      <Skeleton className="h-52 w-full rounded-2xl" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[540px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function AgencyGroup({ group }: { group: NewPropertyAgencyGroup }) {
  const [visibleCount, setVisibleCount] = useState(12);
  const visibleProperties = group.properties.slice(0, visibleCount);
  const hasEnoughHistory = group.history.status === "sufficient";

  return (
    <Card className="gap-0 overflow-hidden border-border/80 py-0 shadow-sm">
      <CardHeader className="border-b bg-gradient-to-r from-primary/[0.07] via-card to-card px-5 py-5 md:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">
                Imóveis de
              </p>
              <h2 className="text-xl font-semibold leading-tight">{group.crawl_agency.name}</h2>
              <p className="text-sm text-muted-foreground">
                Veja os imóveis que merecem sua atenção.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Badge className="border border-sky-200 bg-sky-50 px-3 py-1 text-sky-800 hover:bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
              <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
              {group.counts.new} {group.counts.new === 1 ? "novidade" : "novidades"}
            </Badge>
            <Badge className="border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              <TrendingDown className="mr-1 size-3.5" aria-hidden="true" />
              {group.counts.opportunities} {group.counts.opportunities === 1 ? "oportunidade" : "oportunidades"}
            </Badge>
          </div>
        </div>

        {!hasEnoughHistory && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-50">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200">
              <CircleAlert className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Novidades ainda não disponíveis</p>
              <p className="mt-1 text-sm leading-5 text-amber-900/80 dark:text-amber-100/80">
                Esta imobiliária ainda precisa de mais informações para indicar novidades com segurança.
              </p>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5 md:p-6">
        {group.properties.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 p-7 text-center">
            <p className="font-medium">Nenhum imóvel para mostrar agora</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volte em breve para conferir as novidades desta imobiliária.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => (
              <NewPropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

        {group.properties.length > visibleCount && (
          <div className="mt-6 flex flex-col items-center gap-2 border-t pt-5">
            <p className="text-sm text-muted-foreground">
              Mostrando {visibleCount} de {group.properties.length} imóveis
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisibleCount((current) => current + 12)}
            >
              Mostrar mais imóveis
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function NewPropertiesClient() {
  const [filter, setFilter] = useState<NewPropertyFlagFilter>("all");
  const query = useQuery({
    queryKey: ["new-properties"],
    queryFn: getNewProperties,
  });

  const filteredGroups = useMemo(() => {
    if (!query.data) return [];

    return query.data.data
      .map((group) => ({
        ...group,
        properties: group.properties.filter((property) => matchesFilter(property, filter)),
      }))
      .filter(
        (group) =>
          group.properties.length > 0 ||
          (filter === "all" && group.history.status === "insufficient"),
      );
  }, [filter, query.data]);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <header className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-primary/[0.06] to-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl space-y-3">
            <Badge variant="outline" className="border-primary/25 bg-background/70 text-primary">
              <Sparkles className="mr-1 size-3.5" aria-hidden="true" />
              Seu radar imobiliário
            </Badge>
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Novos imóveis</h1>
              <p className="mt-2 text-base leading-6 text-muted-foreground">
                Descubra imóveis recém-encontrados e oportunidades que combinam com a sua busca.
              </p>
            </div>
          </div>

          {query.data && (
            <div className="grid grid-cols-2 gap-3 sm:min-w-[330px]">
              <div className="rounded-xl border bg-card/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
                  <Sparkles className="size-4" aria-hidden="true" />
                  <span className="text-sm font-medium">Novidades</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{query.data.meta.total_new}</p>
              </div>
              <div className="rounded-xl border bg-card/80 p-4 shadow-sm">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                  <TrendingDown className="size-4" aria-hidden="true" />
                  <span className="text-sm font-medium">Oportunidades</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{query.data.meta.total_opportunities}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      <nav
        className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between"
        aria-label="Filtrar imóveis por classificação"
      >
        <p className="px-2 text-sm font-medium text-muted-foreground">Encontre o que mais combina com você</p>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={filter === option.value ? "default" : "ghost"}
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.value === "opportunity" && <TrendingDown className="size-4" aria-hidden="true" />}
              {option.value === "new" && <Sparkles className="size-4" aria-hidden="true" />}
              {option.label}
            </Button>
          ))}
        </div>
      </nav>

      {query.isPending ? (
        <NewPropertiesSkeleton />
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <h2 className="text-lg font-semibold">Não foi possível carregar os imóveis</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Verifique a conexão com o servidor e tente novamente.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="size-4" aria-hidden="true" />
            )}
            Tentar novamente
          </Button>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <Sparkles className="mx-auto size-9 text-muted-foreground" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold">Nenhum imóvel encontrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Não encontramos imóveis com este filtro no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <AgencyGroup key={group.crawl_agency.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}
