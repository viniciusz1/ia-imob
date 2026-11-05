import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
    // The list pages render their data on the server, so the cache alone
    // doesn't update them: refresh the route after a change.
    const router = useRouter();

    return useMutation({
        mutationFn: (data: RoleFormData) => createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
            router.refresh();
        },
    });
}

export function useUpdateRole(id: number) {
    const queryClient = useQueryClient();
    // The list pages render their data on the server, so the cache alone
    // doesn't update them: refresh the route after a change.
    const router = useRouter();

    return useMutation({
        mutationFn: (data: RoleFormData) => updateRole(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: [...ROLES_QUERY_KEY, id] });
            router.refresh();
        },
    });
}

export function useDeleteRole() {
    const queryClient = useQueryClient();
    // The list pages render their data on the server, so the cache alone
    // doesn't update them: refresh the route after a change.
    const router = useRouter();

    return useMutation({
        mutationFn: (id: number) => deleteRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ROLES_QUERY_KEY });
            router.refresh();
        },
    });
}
