import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

    return useMutation({
        mutationFn: (data: UserFormData) => createUser(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
        },
    });
}

export function useUpdateUser(id: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UserFormData) => updateUser(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: [...USERS_QUERY_KEY, id] });
        },
    });
}

export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });
        },
    });
}
