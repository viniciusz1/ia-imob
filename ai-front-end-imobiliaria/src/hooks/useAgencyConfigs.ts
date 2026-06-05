import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createAgencyConfig,
    createAgencyExtractor,
    deleteAgencyConfig,
    deleteAgencyExtractor,
    getAgencyConfigs,
    updateAgencyConfig,
    updateAgencyExtractor,
} from "@/services/agencyConfigService";
import type {
    AgencyFieldExtractorPayload,
    AgencyPayload,
    AgencyType,
} from "@/types/agencyConfig";

export const AGENCY_CONFIGS_QUERY_KEY = ["agency-configs"];

export function useAgencyConfigs() {
    return useQuery({
        queryKey: AGENCY_CONFIGS_QUERY_KEY,
        queryFn: getAgencyConfigs,
    });
}

export function useCreateAgencyConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ agencyType, payload }: { agencyType: AgencyType; payload: AgencyPayload }) =>
            createAgencyConfig(agencyType, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENCY_CONFIGS_QUERY_KEY }),
    });
}

export function useUpdateAgencyConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            agencyType,
            agencyId,
            payload,
        }: {
            agencyType: AgencyType;
            agencyId: number;
            payload: AgencyPayload;
        }) => updateAgencyConfig(agencyType, agencyId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENCY_CONFIGS_QUERY_KEY }),
    });
}

export function useDeleteAgencyConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ agencyType, agencyId }: { agencyType: AgencyType; agencyId: number }) =>
            deleteAgencyConfig(agencyType, agencyId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENCY_CONFIGS_QUERY_KEY }),
    });
}

export function useCreateAgencyExtractor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            agencyType,
            agencyId,
            payload,
        }: {
            agencyType: AgencyType;
            agencyId: number;
            payload: AgencyFieldExtractorPayload;
        }) => createAgencyExtractor(agencyType, agencyId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENCY_CONFIGS_QUERY_KEY }),
    });
}

export function useUpdateAgencyExtractor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ extractorId, payload }: { extractorId: number; payload: AgencyFieldExtractorPayload }) =>
            updateAgencyExtractor(extractorId, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENCY_CONFIGS_QUERY_KEY }),
    });
}

export function useDeleteAgencyExtractor() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteAgencyExtractor,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: AGENCY_CONFIGS_QUERY_KEY }),
    });
}
