"use client";

import { useQuery } from "@tanstack/react-query";

import { getAuctions } from "@/services/auctionService";
import { getNewProperties } from "@/services/newPropertiesService";
import { getProperties } from "@/services/propertyService";
import { getValuations } from "@/services/valuationService";

/**
 * Data of the home. Each block asks for one small page and reads the KPI
 * total from the same response's `meta`, so the home costs one request per
 * module; nothing is fetched for modules the user cannot open.
 */
const STALE_TIME = 60 * 1000;

/** How many recent items each list shows. */
export const RECENT_NEW_PROPERTIES = 5;
export const RECENT_VALUATIONS = 5;
export const UPCOMING_AUCTIONS = 4;

export function usePropertiesTotal(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "properties-total"],
        queryFn: async () => (await getProperties({ page: 1, per_page: 1 })).meta.total,
        enabled,
        staleTime: STALE_TIME,
    });
}

/** Most recent new listings plus the novidades/oportunidades totals. */
export function useRecentNewProperties(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "new-properties"],
        queryFn: async () => {
            const { data, meta } = await getNewProperties({
                page: 1,
                per_page: RECENT_NEW_PROPERTIES,
                sort: "identified_desc",
            });
            const items = data
                .flatMap((group) => group.properties.map((property) => ({ property, agency: group.crawl_agency.name })))
                .slice(0, RECENT_NEW_PROPERTIES);

            return {
                items,
                newCount: meta.total_new,
                opportunities: meta.total_opportunities,
                updatedAt: meta.updated_at ?? null,
            };
        },
        enabled,
        staleTime: STALE_TIME,
    });
}

/** Latest saved valuations plus the total. */
export function useRecentValuations(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "valuations"],
        queryFn: async () => {
            const response = await getValuations(1, RECENT_VALUATIONS);
            return { items: response.data.slice(0, RECENT_VALUATIONS), total: response.meta.total };
        },
        enabled,
        staleTime: STALE_TIME,
    });
}

/** Next auctions by date plus the total monitored. */
export function useUpcomingAuctions(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "auctions"],
        queryFn: async () => {
            const response = await getAuctions({ page: 1, per_page: UPCOMING_AUCTIONS, sort: "date", direction: "asc" });
            return { items: response.data.slice(0, UPCOMING_AUCTIONS), total: response.meta.total };
        },
        enabled,
        staleTime: STALE_TIME,
    });
}
