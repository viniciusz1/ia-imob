"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarClock, Loader2, RefreshCw, Sparkles, TrendingDown } from "lucide-react";

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
  { value: "all", label: "Todos" },
  { value: "new", label: "Novos" },
  { value: "opportunity", label: "Oportunidades" },
  { value: "both", label: "Novo + Oportunidade" },
];

function formatDate(value: string | null): string {
  if (!value) return "Aguardando primeiro snapshot";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function matchesFilter(property: NewPropertyItem, filter: NewPropertyFlagFilter): boolean {
  if (filter === "new") return property.is_new;
  if (filter === "opportunity") return property.is_opportunity;
  if (filter === "both") return property.is_new && property.is_opportunity;

  return true;
}

function NewPropertiesSkeleton() {
  return (
    <div className="space-y-6" aria-label="Carregando novos imóveis">
      <Skeleton className="h-10 w-full max-w-2xl" />
      <Skeleton className="h-16 w-full" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-[480px] w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function AgencyGroup({ group }: { group: NewPropertyAgencyGroup }) {
  const [visibleCount, setVisibleCount] = useState(12);
  const visibleProperties = group.properties.slice(0, visibleCount);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardHeader className="border-b bg-muted/30 px-5 py-5 md:px-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="space-y-1.5">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Building2 className="size-5 text-primary" aria-hidden="true" />
              {group.crawl_agency.name}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarClock className="size-4" aria-hidden="true" />
              Snapshot publicado em {formatDate(group.snapshot.published_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{group.counts.new} novos</Badge>
            <Badge
              variant="outline"
              className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
            >
              {group.counts.opportunities} oportunidades
            </Badge>
          </div>
        </div>

        {group.history.status === "insufficient" && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Histórico insuficiente para classificar anúncios como novos. São necessários snapshots publicados anteriores.
          </div>
        )}
      </CardHeader>

      <CardContent className="p-5 md:p-6">
        {group.properties.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum imóvel desta imobiliária corresponde ao filtro selecionado.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {visibleProperties.map((property) => (
              <NewPropertyCard
                key={property.id}
                property={property}
                publishedAt={group.snapshot.published_at}
              />
            ))}
          </div>
        )}

        {group.properties.length > visibleCount && (
          <div className="mt-6 flex flex-col items-center gap-2 border-t pt-5">
            <p className="text-sm text-muted-foreground">
              Mostrando {visibleCount} de {group.properties.length} imóveis classificados
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
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <h1 className="text-3xl font-bold tracking-tight">Novos imóveis</h1>
          </div>
          <p className="max-w-3xl text-muted-foreground">
            Anúncios recentes e oportunidades de custo-benefício encontrados nos últimos snapshots publicados.
          </p>
        </div>

        {query.data && (
          <div className="text-sm text-muted-foreground lg:text-right">
            <p>Atualizado em {formatDate(query.data.meta.updated_at)}</p>
            <p>
              {query.data.meta.total_new} novos • {query.data.meta.total_opportunities} oportunidades
            </p>
          </div>
        )}
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Filtrar imóveis por classificação">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={filter === option.value ? "default" : "outline"}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.value === "opportunity" && <TrendingDown className="size-4" aria-hidden="true" />}
            {option.value === "new" && <Sparkles className="size-4" aria-hidden="true" />}
            {option.label}
          </Button>
        ))}
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
            Não há anúncios com esta classificação nos snapshots publicados mais recentes.
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
