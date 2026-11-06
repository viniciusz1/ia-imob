
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { postLoginPath } from "@/lib/permissions";
import { useAuthStore } from "@/store/useAuthStore";
import { RestoreAuthSession } from "@/components/features/auth/RestoreAuthSession";
import { UserNav } from "@/components/features/auth/UserNav";
import { AppNavigation, AppTopbarTitle } from "@/components/features/navigation/AppNavigation";
import { AppShell } from "@/components/layout/AppShell";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const user = useAuthStore((state) => state.user);
    const router = useRouter();
    const destination = user?.is_platform_admin ? postLoginPath(user) : null;
    useEffect(() => {
        if (destination && destination !== "/") router.replace(destination);
    }, [destination, router]);
    if (user?.is_platform_admin) {
        return destination === "/" ? (
            <div className="flex min-h-svh flex-col items-center justify-center gap-4">
                <p>Seu usuário não possui acesso aos módulos administrativos.</p>
                <UserNav />
            </div>
        ) : null;
    }
    return (
        <>
            <RestoreAuthSession />
            <AppShell
                brand={<SidebarBrand caption="Sistema imobiliário" href="/" title="Início do CRM" />}
                navigation={<AppNavigation />}
                sidebarFooter={<UserNav />}
                topbar={<AppTopbarTitle />}
                topbarActions={<ThemeToggle />}
            >
                {children}
            </AppShell>
        </>
    );
}
