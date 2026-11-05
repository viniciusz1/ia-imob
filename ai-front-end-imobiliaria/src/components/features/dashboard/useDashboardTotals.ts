"use client";

import { useQuery } from "@tanstack/react-query";

import { getAuctions } from "@/services/auctionService";
import { getNewProperties } from "@/services/newPropertiesService";
import { getProperties } from "@/services/propertyService";
import { getValuations } from "@/services/valuationService";

/**
 * Totals shown on the home. Each list is requested with a single item per
 * page only to read its `meta`; nothing is fetched for modules the user
 * cannot open.
 */
const STALE_TIME = 60 * 1000;

export function usePropertiesTotal(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "properties-total"],
        queryFn: async () => (await getProperties({ page: 1, per_page: 1 })).meta.total,
        enabled,
        staleTime: STALE_TIME,
    });
}

export function useNewPropertiesTotals(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "new-properties-totals"],
        queryFn: async () => {
            const { meta } = await getNewProperties({ page: 1, per_page: 1 });
            return { newCount: meta.total_new, opportunities: meta.total_opportunities, total: meta.total };
        },
        enabled,
        staleTime: STALE_TIME,
    });
}

export function useAuctionsTotal(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "auctions-total"],
        queryFn: async () => (await getAuctions({ page: 1, per_page: 1 })).meta.total,
        enabled,
        staleTime: STALE_TIME,
    });
}

export function useValuationsTotal(enabled: boolean) {
    return useQuery({
        queryKey: ["dashboard", "valuations-total"],
        queryFn: async () => (await getValuations(1, 1)).meta.total,
        enabled,
        staleTime: STALE_TIME,
    });
}
