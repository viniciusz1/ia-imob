import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createProperty,
    deleteProperty,
    getFeatures,
    getProperties,
    getPropertyById,
    updateProperty,
} from "@/services/propertyService";
import type { PropertyFiltersParams, PropertyFormData } from "@/types/property";

export const PROPERTIES_QUERY_KEY = ["properties"];
export const PROPERTY_FEATURES_QUERY_KEY = ["property-features"];

export function useGetProperties(filters: PropertyFiltersParams) {
    return useQuery({
        queryKey: [...PROPERTIES_QUERY_KEY, filters],
        queryFn: () => getProperties(filters),
        placeholderData: (previousData) => previousData,
    });
}

export function useGetProperty(id: number, enabled: boolean = true) {
    return useQuery({
        queryKey: [...PROPERTIES_QUERY_KEY, id],
        queryFn: () => getPropertyById(id),
        enabled: enabled && !!id,
    });
}

export function useGetFeatures() {
    return useQuery({
        queryKey: PROPERTY_FEATURES_QUERY_KEY,
        queryFn: () => getFeatures(),
        staleTime: 1000 * 60 * 30,
    });
}

export function useCreateProperty() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PropertyFormData) => createProperty(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROPERTIES_QUERY_KEY });
        },
    });
}

export function useUpdateProperty(id: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: PropertyFormData) => updateProperty(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROPERTIES_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: [...PROPERTIES_QUERY_KEY, id] });
        },
    });
}

export function useDeleteProperty() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteProperty(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROPERTIES_QUERY_KEY });
        },
    });
}
