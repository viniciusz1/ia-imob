"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MarketAnalyticsFilters } from "@/types/analytics";

export const EMPTY_FILTERS: MarketAnalyticsFilters = {
  cidade: "",
  bairro: [],
  tipo: [],
  imobiliaria: [],
  quartos: [],
  vagas: [],
  min: "",
  max: "",
  area_min: "",
  area_max: "",
  data_inicio: "",
  data_fim: "",
};

const TEXT_KEYS = ["cidade", "min", "max", "area_min", "area_max", "data_inicio", "data_fim"] as const;
const LIST_KEYS = ["bairro", "tipo", "imobiliaria"] as const;
const NUMBER_LIST_KEYS = ["quartos", "vagas"] as const;

export function readFilters(params: URLSearchParams): MarketAnalyticsFilters {
  const filters: MarketAnalyticsFilters = { ...EMPTY_FILTERS };

  TEXT_KEYS.forEach((key) => {
    filters[key] = params.get(key) ?? "";
  });

  LIST_KEYS.forEach((key) => {
    filters[key] = params.getAll(`${key}[]`).filter(Boolean);
  });

  NUMBER_LIST_KEYS.forEach((key) => {
    filters[key] = params
      .getAll(`${key}[]`)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
  });

  return filters;
}

export function writeFilters(filters: MarketAnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams();

  TEXT_KEYS.forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });

  LIST_KEYS.forEach((key) => {
    filters[key].forEach((value) => params.append(`${key}[]`, value));
  });

  NUMBER_LIST_KEYS.forEach((key) => {
    filters[key].forEach((value) => params.append(`${key}[]`, String(value)));
  });

  return params;
}

export function useMarketAnalyticsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => readFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: MarketAnalyticsFilters) => {
      const query = writeFilters(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  return { filters, setFilters };
}
