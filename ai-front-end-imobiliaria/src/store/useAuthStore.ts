import { create } from "zustand";

export interface User {
    id: number;
    name: string;
    email: string;
    is_platform_admin: boolean;
    permissions?: string[];
    [key: string]: unknown;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    setUser: (user: User | null) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    clearAuth: () => set({ user: null, isAuthenticated: false }),
}));
