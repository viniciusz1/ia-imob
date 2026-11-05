"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  Building2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  X,
} from "lucide-react";

import { NewPropertyCard } from "./NewPropertyCard";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/layout/StatCard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterSelect } from "@/components/ui/filter-select";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { getNewProperties } from "@/services/newPropertiesService";
import type {
  NewPropertyAgencyGroup,
  NewPropertyFlagFilter,
  NewPropertiesParams,
} from "@/types/newProperties";

// Botões de classificação exibidos acima dos filtros.
const FILTERS: Array<{ value: NewPropertyFlagFilter; label: string }> = [
  { value: "all", label: "Todos os imóveis" },
  { value: "new", label: "Novidades" },
  { value: "opportunity", label: "Oportunidades" },
  { value: "both", label: "Novidades com oportunidade" },
];

// Opções dos filtros de quartos, banheiros e vagas. "5+" significa cinco ou mais.
const COUNT_FILTER_VALUES = ["1", "2", "3", "4", "5+"] as const;
type CountFilterValue = "all" | (typeof COUNT_FILTER_VALUES)[number];

/** Monta o texto da opção, usando o singular quando o valor é 1 ("1 quarto"). */
function countLabel(value: (typeof COUNT_FILTER_VALUES)[number], unit: string): string {
  if (value === "5+") return `5+ ${unit}`;
  if (value === "1") return `1 ${unit.slice(0, -1)}`;

  return `${value} ${unit}`;
}

/** Espaço reservado exibido enquanto a API responde. */
function NewPropertiesSkeleton() {
  return (
    <div className="space-y-6" aria-label="Carregando novos imóveis">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-[540px] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Bloco de uma imobiliária, com seus totais e os cards dos anúncios da página. */
function AgencyGroup({ group }: { group: NewPropertyAgencyGroup }) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex flex-col justify-between gap-4 px-6 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6 md:flex-row md:items-start">
        <div className="flex min-w-0 items-center gap-3">
          <Building2 className="size-6 shrink-0 text-sidebar-highlight" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm leading-4 font-semibold text-subtle">Imóveis de</p>
            <h2 className="truncate text-xl leading-6 font-semibold tracking-[-0.01em]">{group.crawl_agency.name}</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Badge variant="info">
            <Sparkles aria-hidden="true" />
            {group.counts.new} {group.counts.new === 1 ? "novidade" : "novidades"}
          </Badge>
          <Badge variant="success">
            <TrendingDown aria-hidden="true" />
            {group.counts.opportunities} {group.counts.opportunities === 1 ? "oportunidade" : "oportunidades"}
          </Badge>
        </div>
      </div>

      <div className="px-6 pb-6 sm:px-8 sm:pb-8">
        {group.properties.length === 0 ? (
          <div className="rounded-xl bg-muted p-7 text-center">
            <p className="font-medium">Nenhum imóvel para mostrar agora</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volte em breve para conferir as novidades desta imobiliária.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {group.properties.map((property) => (
              <NewPropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Tela de Novos Imóveis.
 *
 * Os filtros ficam no estado da tela, mas quem filtra, ordena e pagina é a API.
 * Toda mudança de filtro volta para a página 1, porque a página atual pode não
 * existir no novo resultado.
 */
export function NewPropertiesClient() {
  const [filter, setFilter] = useState<NewPropertyFlagFilter>("all");
  const [search, setSearch] = useState("");
  const [agency, setAgency] = useState("all");
  const [propertyType, setPropertyType] = useState("all");
  const [city, setCity] = useState("all");
  const [neighborhood, setNeighborhood] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [sort, setSort] = useState<NonNullable<NewPropertiesParams["sort"]>>("identified_desc");
  const [page, setPage] = useState(1);
  const [bedrooms, setBedrooms] = useState<CountFilterValue>("all");
  const [bathrooms, setBathrooms] = useState<CountFilterValue>("all");
  const [parkingSpaces, setParkingSpaces] = useState<CountFilterValue>("all");

  // Espera o usuário parar de digitar para não fazer uma consulta a cada letra.
  const debouncedSearch = useDebouncedValue(search.trim());

  // Só envia à API os filtros realmente escolhidos; "all" significa sem filtro.
  const params: NewPropertiesParams = {
    flag: filter,
    sort,
    page,
    per_page: 24,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(agency !== "all" && { agency_id: Number(agency) }),
    ...(propertyType !== "all" && { type: propertyType }),
    ...(city !== "all" && { city }),
    ...(neighborhood !== "all" && { neighborhood }),
    ...(purpose !== "all" && { purpose }),
    ...(bedrooms !== "all" && { bedrooms }),
    ...(bathrooms !== "all" && { bathrooms }),
    ...(parkingSpaces !== "all" && { parking: parkingSpaces }),
  };
  // Os parâmetros fazem parte da chave, então cada combinação de filtros tem seu cache.
  const query = useQuery({
    queryKey: ["new-properties", params],
    queryFn: () => getNewProperties(params),
    staleTime: 30_000,
    // Ao trocar filtro ou página, a tela continua mostrando o resultado anterior
    // até o novo chegar, em vez de sumir e voltar.
    placeholderData: keepPreviousData,
  });
  // Novo resultado a caminho com o anterior ainda na tela.
  const isRefreshing = query.isPlaceholderData && query.isFetching;
  // As opções dos filtros vêm da API, de acordo com os dados realmente disponíveis.
  const filterOptions = query.data?.meta.filters;

  const hasPropertyFilters =
    Boolean(search.trim()) ||
    agency !== "all" ||
    propertyType !== "all" ||
    city !== "all" ||
    neighborhood !== "all" ||
    purpose !== "all" ||
    bedrooms !== "all" ||
    bathrooms !== "all" ||
    parkingSpaces !== "all";

  function clearPropertyFilters() {
    setSearch("");
    setAgency("all");
    setPropertyType("all");
    setCity("all");
    setNeighborhood("all");
    setPurpose("all");
    setBedrooms("all");
    setBathrooms("all");
    setParkingSpaces("all");
    setPage(1);
  }

  // Imobiliárias sem anúncios nesta página não aparecem.
  const visibleGroups = query.data?.data.filter((group) => group.properties.length > 0) ?? [];
  // Falta de permissão tem mensagem própria: tentar de novo não resolveria.
  const isForbidden = isAxiosError(query.error) && query.error.response?.status === 403;

  return (
    <div className="space-y-6">
      <PageHeader
        badge={
          <Badge variant="outline">
            <Sparkles aria-hidden="true" />
            Seu radar imobiliário
          </Badge>
        }
        description="Descubra imóveis recém-encontrados e oportunidades que combinam com a sua busca."
        title="Novos imóveis"
      />

      {query.data && (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard icon={Sparkles} title="Novidades" tone="info" value={query.data.meta.total_new} />
          <StatCard icon={TrendingDown} title="Oportunidades" tone="success" value={query.data.meta.total_opportunities} />
        </div>
      )}

      <Card className="gap-0 p-0">
        <nav aria-label="Filtrar imóveis por classificação">
          <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
            <div className="relative min-w-64 flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setPage(1); }}
                aria-label="Buscar imóveis"
                placeholder="Buscar por imóvel, bairro ou cidade"
                className="pl-10"
                size="sm"
              />
            </div>
            <ToggleGroup
              aria-label="Classificação dos imóveis"
              className="max-w-full overflow-x-auto"
              onValueChange={(value) => { setFilter(value as NewPropertyFlagFilter); setPage(1); }}
              type="single"
              value={filter}
            >
              {FILTERS.map((option) => (
                <ToggleGroupItem className="gap-1.5" key={option.value} value={option.value}>
                  {option.value === "opportunity" && <TrendingDown className="size-4" aria-hidden="true" />}
                  {option.value === "new" && <Sparkles className="size-4" aria-hidden="true" />}
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="grid gap-3 border-t p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4 2xl:grid-cols-5">
            <FilterSelect
              aria-label="Filtrar por imobiliária"
              emptyValue="all"
              onValueChange={(value) => { setAgency(value); setPage(1); }}
              options={[
                { value: "all", label: "Todas as imobiliárias" },
                ...(filterOptions?.agencies.map((option) => ({ value: String(option.id), label: option.name })) ?? []),
              ]}
              placeholder="Imobiliária"
              value={agency}
            />
            <FilterSelect
              aria-label="Filtrar por tipo"
              emptyValue="all"
              onValueChange={(value) => { setPropertyType(value); setPage(1); }}
              options={[
                { value: "all", label: "Todos os tipos" },
                ...(filterOptions?.types.map((type) => ({ value: type, label: type })) ?? []),
              ]}
              placeholder="Tipo"
              value={propertyType}
            />
            <FilterSelect
              aria-label="Filtrar por cidade"
              emptyValue="all"
              onValueChange={(value) => { setCity(value); setPage(1); }}
              options={[
                { value: "all", label: "Todas as cidades" },
                ...(filterOptions?.cities.map((option) => ({ value: option, label: option })) ?? []),
              ]}
              placeholder="Cidade"
              value={city}
            />
            <FilterSelect
              aria-label="Filtrar por bairro"
              emptyValue="all"
              onValueChange={(value) => { setNeighborhood(value); setPage(1); }}
              options={[
                { value: "all", label: "Todos os bairros" },
                ...(filterOptions?.neighborhoods.map((option) => ({ value: option, label: option })) ?? []),
              ]}
              placeholder="Bairro"
              value={neighborhood}
            />
            <FilterSelect
              aria-label="Filtrar por finalidade"
              emptyValue="all"
              onValueChange={(value) => { setPurpose(value); setPage(1); }}
              options={[
                { value: "all", label: "Todas as finalidades" },
                ...(filterOptions?.purposes.map((option) => ({
                  value: option,
                  label: option === "locacao" ? "Locação" : "Venda",
                })) ?? []),
              ]}
              placeholder="Finalidade"
              value={purpose}
            />
            <FilterSelect
              aria-label="Filtrar por quartos"
              emptyValue="all"
              onValueChange={(value) => { setBedrooms(value as CountFilterValue); setPage(1); }}
              options={[
                { value: "all", label: "Qualquer quarto" },
                ...COUNT_FILTER_VALUES.map((value) => ({ value, label: countLabel(value, "quartos") })),
              ]}
              placeholder="Quartos"
              value={bedrooms}
            />
            <FilterSelect
              aria-label="Filtrar por banheiros"
              emptyValue="all"
              onValueChange={(value) => { setBathrooms(value as CountFilterValue); setPage(1); }}
              options={[
                { value: "all", label: "Qualquer banheiro" },
                ...COUNT_FILTER_VALUES.map((value) => ({ value, label: countLabel(value, "banheiros") })),
              ]}
              placeholder="Banheiros"
              value={bathrooms}
            />
            <FilterSelect
              aria-label="Filtrar por vagas"
              emptyValue="all"
              onValueChange={(value) => { setParkingSpaces(value as CountFilterValue); setPage(1); }}
              options={[
                { value: "all", label: "Qualquer vaga" },
                ...COUNT_FILTER_VALUES.map((value) => ({ value, label: countLabel(value, "vagas") })),
              ]}
              placeholder="Vagas"
              value={parkingSpaces}
            />
            <Select value={sort} onValueChange={(value) => { setSort(value as NonNullable<NewPropertiesParams["sort"]>); setPage(1); }}>
              <SelectTrigger className="w-full" size="sm" aria-label="Ordenar imóveis"><SelectValue placeholder="Ordenar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="identified_desc">Mais recentes</SelectItem>
                <SelectItem value="identified_asc">Mais antigos</SelectItem>
                <SelectItem value="opportunity_desc">Melhor oportunidade</SelectItem>
              </SelectContent>
            </Select>
            {hasPropertyFilters && (
              <Button className="justify-self-start" type="button" size="sm" variant="ghost" onClick={clearPropertyFilters}>
                <X className="size-4" aria-hidden="true" />
                Limpar filtros
              </Button>
            )}
          </div>
        </nav>
      </Card>

      {query.isPending ? (
        <NewPropertiesSkeleton />
      ) : isForbidden ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
          <h2 className="text-lg font-semibold">Você não tem acesso a esta tela</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Peça a um administrador da sua imobiliária a permissão para ver imóveis.
          </p>
        </div>
      ) : query.isError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center">
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
      ) : visibleGroups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Sparkles className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <h2 className="mt-3 text-lg font-semibold">Nenhum imóvel encontrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Não encontramos imóveis com este filtro no momento.
          </p>
        </div>
      ) : (
        <div
          aria-busy={isRefreshing}
          className={cn("relative space-y-6 transition-opacity duration-200", isRefreshing && "pointer-events-none opacity-60")}
        >
          {isRefreshing && (
            <div
              className="absolute inset-x-0 -top-3 h-0.5 overflow-hidden rounded-full bg-primary/20"
              role="progressbar"
              aria-label="Atualizando imóveis"
            >
              <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </div>
          )}
          {visibleGroups.map((group) => (
            <AgencyGroup key={group.crawl_agency.id} group={group} />
          ))}
          {query.data && query.data.meta.pagination.last_page > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-card-edge bg-card px-6 py-4 sm:px-8" aria-label="Paginar imóveis">
              <span className="text-sm text-muted-foreground tabular-nums">Página {page} de {query.data.meta.pagination.last_page}</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={!query.data.meta.pagination.has_more} onClick={() => setPage((current) => current + 1)}>Próxima</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
