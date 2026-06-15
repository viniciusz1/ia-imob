"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { authService } from "@/services/authService";
import { clearAuthenticatedSession } from "@/services/authSessionCookie";
import { hasPermission } from "@/lib/permissions";

const PLATFORM_PERMISSION = "platform.agencies.view";

function hasSessionCookie(): boolean {
    if (typeof document === "undefined") return false;
    return document.cookie.includes("ia_imob_authenticated=1");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(() => {
        if (typeof document === "undefined") return true;
        return !useAuthStore.getState().isAuthenticated && hasSessionCookie();
    });

    useEffect(() => {
        if (isAuthenticated || !isChecking) return;

        authService
            .getUser()
            .then((response) => {
                const userData = response.data.data ?? response.data;
                useAuthStore.getState().setUser(userData);
            })
            .catch(() => {
                clearAuthenticatedSession();
                useAuthStore.getState().clearAuth();
            })
            .finally(() => setIsChecking(false));
    }, [isAuthenticated, isChecking]);

    useEffect(() => {
        if (isChecking) return;

        if (!isAuthenticated) {
            router.replace("/login");
            return;
        }

        const perms = Array.isArray(user?.permissions) ? user.permissions : null;
        if (!hasPermission(perms, PLATFORM_PERMISSION)) {
            router.replace("/");
        }
    }, [isChecking, isAuthenticated, user, router]);

    if (isChecking) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
            </div>
        );
    }

    if (!isAuthenticated) return null;
    const perms = Array.isArray(user?.permissions) ? user.permissions : null;
    if (!hasPermission(perms, PLATFORM_PERMISSION)) return null;

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b px-6 py-4">
                <h1 className="text-xl font-semibold">Administração da Plataforma</h1>
            </header>
            <main className="p-6">{children}</main>
        </div>
    );
}
