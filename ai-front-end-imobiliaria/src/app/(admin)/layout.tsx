"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Loader2, ShieldCheck } from "lucide-react";

import { PlatformAdminNavigation } from "@/components/features/admin/navigation/PlatformAdminNavigation";
import { UserNav } from "@/components/features/auth/UserNav";
import { CrawlerAutoRefresh } from "@/components/features/crawler/CrawlerAutoRefresh";
import { AppShell } from "@/components/layout/AppShell";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { SidebarUserCard } from "@/components/layout/SidebarUserCard";
import { authService } from "@/services/authService";
import { clearAuthenticatedSession } from "@/services/authSessionCookie";
import { hasPermission } from "@/lib/permissions";

const BREADCRUMB_LABELS: Record<string, string> = {
    admin: "Administração",
    agencies: "Agências",
    new: "Novo cadastro",
    crawler: "Crawler",
    prospects: "Prospecção",
    operations: "Operações",
    quality: "Qualidade",
    settings: "Configurações",
    crawls: "Crawls",
    discoveries: "Discoveries",
    onboarding: "Onboarding",
    profiles: "Perfis de extração",
    schedule: "Agenda",
    runs: "Execuções",
};

const BREADCRUMB_PATH_LABELS: Record<string, string> = {
    "/admin/crawler/agencies": "Crawl Agencies",
};

// Route segments that group pages but have no page of their own.
const UNLINKED_BREADCRUMBS = [
    /^\/admin\/crawler\/runs$/,
    /^\/admin\/crawler\/discoveries$/,
    /^\/admin\/crawler\/agencies\/[^/]+\/crawls\/operations$/,
];

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
            sidebarFooter={<SidebarUserCard roleLabel="Platform Admin" />}
            topbar={<Breadcrumbs labels={BREADCRUMB_LABELS} pathLabels={BREADCRUMB_PATH_LABELS} unlinkedPaths={UNLINKED_BREADCRUMBS} />}
            topbarActions={
                <>
                    {/* Crawler screens mirror live worker state, so they refresh on a timer. */}
                    {pathname.startsWith("/admin/crawler") && (
                        <div className="hidden sm:block">
                            <CrawlerAutoRefresh />
                        </div>
                    )}
                    <UserNav />
                </>
            }
        >
            {children}
        </AppShell>
    );
}
