import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    getRoles,
    getPaginatedRoles,
    getRoleById,
    createRole,
    updateRole,
    deleteRole,
    getPermissions,
} from "@/services/roleService";
import type { RoleFormData } from "@/types/role";

export const ROLES_QUERY_KEY = ["roles"];
export const PERMISSIONS_QUERY_KEY = ["permissions"];

export function useRoles(enabled: boolean = true) {
    return useQuery({
        queryKey: [...ROLES_QUERY_KEY, "all"],
        queryFn: () => getRoles(),
        enabled,
    });
}

export function usePaginatedRoles(page: number = 1) {
    return useQuery({
        queryKey: [...ROLES_QUERY_KEY, "paginated", page],
        queryFn: () => getPaginatedRoles(page),
    });
}

export function useRole(id: number, enabled: boolean = true) {
    return useQuery({
        queryKey: [...ROLES_QUERY_KEY, id],
        queryFn: () => getRoleById(id),
        enabled: enabled && !!id,
    });
}

export function usePermissions() {
    return useQuery({
        queryKey: PERMISSIONS_QUERY_KEY,
        queryFn: () => getPermissions(),
        staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    });
}

export function useCreateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: RoleFormData) => createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
        },
    });
}

export function useUpdateRole(id: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: RoleFormData) => updateRole(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: [...ROLES_QUERY_KEY, id] });
        },
    });
}

export function useDeleteRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
        },
    });
}
