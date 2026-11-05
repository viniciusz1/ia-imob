"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Loader2, ShieldCheck } from "lucide-react";

import { PlatformAdminNavigation, PlatformAdminTopbar } from "@/components/features/admin/navigation/PlatformAdminNavigation";
import { UserNav } from "@/components/features/auth/UserNav";
import { CrawlerAutoRefresh } from "@/components/features/crawler/CrawlerAutoRefresh";
import { shouldAutoRefreshCrawlerPath } from "@/components/features/crawler/CrawlerRefreshBoundary";
import { AppShell } from "@/components/layout/AppShell";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
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
            <div className="flex min-h-svh items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Carregando...
            </div>
        );
    }

    if (!isAuthenticated) return null;
    const perms = Array.isArray(user?.permissions) ? user.permissions : null;
    if (user?.is_platform_admin !== true || !hasPermission(perms, requiredPermission)) return null;

    return (
        <AppShell
            brand={<SidebarBrand caption="Administração da plataforma" href="/admin" icon={ShieldCheck} title="IA Imob" />}
            navigation={<PlatformAdminNavigation />}
            sidebarFooter={<UserNav roleLabel="Platform Admin" />}
            topbar={<PlatformAdminTopbar />}
            topbarActions={
                // Crawler list screens mirror live worker state, so they refresh on a timer.
                shouldAutoRefreshCrawlerPath(pathname) && (
                    <div className="hidden sm:block">
                        <CrawlerAutoRefresh />
                    </div>
                )
            }
        >
            {children}
        </AppShell>
    );
}
