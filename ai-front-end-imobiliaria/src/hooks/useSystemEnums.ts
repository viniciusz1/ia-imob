import { useQuery } from "@tanstack/react-query";
import { getSystemEnums } from "@/services/propertyService";

export const SYSTEM_ENUMS_QUERY_KEY = ["system-enums"];

export function useSystemEnums(tags: string[] = ["property_types", "property_purposes", "property_statuses"]) {
    return useQuery({
        queryKey: [...SYSTEM_ENUMS_QUERY_KEY, ...tags],
        queryFn: () => getSystemEnums(tags),
        staleTime: 1000 * 60 * 60 * 24,
        gcTime: 1000 * 60 * 60 * 24,
    });
}
