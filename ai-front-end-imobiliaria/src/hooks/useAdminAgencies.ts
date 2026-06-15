import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
    activateAgency,
    deactivateAgency,
    listAgencies,
    updateAgency,
    type AgencySummary,
    type AgencyUpdatePayload,
} from "@/services/adminApi";

export const ADMIN_AGENCIES_QUERY_KEY = ["admin", "agencies"];

export function useAdminAgencies(initialData?: AgencySummary[]) {
    return useQuery({
        queryKey: ADMIN_AGENCIES_QUERY_KEY,
        queryFn: listAgencies,
        initialData,
    });
}

export function useUpdateAgency(id: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: AgencyUpdatePayload) => updateAgency(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_AGENCIES_QUERY_KEY });
        },
    });
}

export function useActivateAgency() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => activateAgency(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_AGENCIES_QUERY_KEY });
        },
    });
}

export function useDeactivateAgency() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deactivateAgency(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_AGENCIES_QUERY_KEY });
        },
    });
}
