import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
} from "@/services/userService";
import type { UserFiltersParams, UserFormData } from "@/types/user";

export const USERS_QUERY_KEY = ["users"];

export function useUsers(filters: UserFiltersParams) {
    return useQuery({
        queryKey: [...USERS_QUERY_KEY, filters],
        queryFn: () => getUsers(filters),
        placeholderData: (previousData) => previousData, // keep previous data while fetching
    });
}

export function useUser(id: number, enabled: boolean = true) {
    return useQuery({
        queryKey: [...USERS_QUERY_KEY, id],
        queryFn: () => getUserById(id),
        enabled: enabled && !!id,
    });
}

export function useCreateUser() {
    const queryClient = useQueryClient();
    // The list pages render their data on the server, so the cache alone
    // doesn't update them: refresh the route after a change.
    const router = useRouter();

    return useMutation({
        mutationFn: (data: UserFormData) => createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
            router.refresh();
        },
    });
}

export function useUpdateUser(id: number) {
    const queryClient = useQueryClient();
    // The list pages render their data on the server, so the cache alone
    // doesn't update them: refresh the route after a change.
    const router = useRouter();

    return useMutation({
        mutationFn: (data: UserFormData) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: [...USERS_QUERY_KEY, id] });
            router.refresh();
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();
    // The list pages render their data on the server, so the cache alone
    // doesn't update them: refresh the route after a change.
    const router = useRouter();

    return useMutation({
        mutationFn: (id: number) => deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
            router.refresh();
        },
    });
}
