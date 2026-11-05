"use client";

import { createContext, useContext } from "react";
import type { CrawlAgency } from "@/types/crawler";

export interface CrawlAgencyHeaderData {
  agency?: CrawlAgency;
  area?: string;
  description?: string;
}

export interface CrawlAgencyLayoutContextValue {
  inLayout: boolean;
  setHeaderData: (data: CrawlAgencyHeaderData) => void;
}

export const CrawlAgencyLayoutContext = createContext<CrawlAgencyLayoutContextValue>({
  inLayout: false,
  setHeaderData: () => undefined,
});

export function useCrawlAgencyLayout() {
  return useContext(CrawlAgencyLayoutContext);
}
