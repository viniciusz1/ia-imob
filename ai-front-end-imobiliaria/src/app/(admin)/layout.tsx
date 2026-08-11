"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PlatformAdminNavigation } from "@/components/features/admin/navigation/PlatformAdminNavigation";
import { authService } from "@/services/authService";
import { clearAuthenticatedSession } from "@/services/authSessionCookie";
import { hasPermission } from "@/lib/permissions";

function hasSessionCookie(): boolean {
    if (typeof document === "undefined") return false;
    return document.cookie.includes("ia_imob_authenticated=1");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = useAuthStore((state) => state.user);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const router = useRouter();
    const pathname = usePathname();
    const requiredPermission = pathname.startsWith("/admin/crawler")
        ? "crawler.view"
        : "platform.agencies.view";
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
        if (user?.is_platform_admin !== true || !hasPermission(perms, requiredPermission)) {
            router.replace("/");
        }
    }, [isChecking, isAuthenticated, user, router, requiredPermission]);

    if (isChecking) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-muted-foreground">Carregando...</p>
            </div>
        );
    }

    if (!isAuthenticated) return null;
    const perms = Array.isArray(user?.permissions) ? user.permissions : null;
    if (user?.is_platform_admin !== true || !hasPermission(perms, requiredPermission)) return null;

    return (
        <div className="min-h-screen bg-background md:grid md:grid-cols-[232px_1fr]">
            <aside className="border-b bg-sidebar md:sticky md:top-0 md:flex md:h-svh md:flex-col md:border-b-0 md:border-r">
                <div className="flex items-center gap-2.5 px-5 pt-4">
                    <span
                        aria-hidden="true"
                        className="grid size-7 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground"
                    >
                        PA
                    </span>
                    <span className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold">Plataforma</span>
                        <span className="text-xs text-muted-foreground">Administração</span>
                    </span>
                </div>

                <PlatformAdminNavigation />
            </aside>

            {/* p-6 is the Admin Area gutter every page inherits. The Crawler module
                cancels it with -mx-6 -mt-6 so its header and tab bar can span edge
                to edge, so this padding must stay on <main>. */}
            <div className="flex min-w-0 flex-col">
                <main className="flex-1 p-6">{children}</main>
            </div>
        </div>
    );
}
