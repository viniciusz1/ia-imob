import { Building2 } from "lucide-react";

import { RestoreAuthSession } from "@/components/features/auth/RestoreAuthSession";
import { UserNav } from "@/components/features/auth/UserNav";
import { AppBreadcrumbs } from "@/components/features/navigation/AppBreadcrumbs";
import { AppNavigation } from "@/components/features/navigation/AppNavigation";
import { AppShell } from "@/components/layout/AppShell";
import { SidebarBrand } from "@/components/layout/SidebarBrand";
import { SidebarUserCard } from "@/components/layout/SidebarUserCard";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <RestoreAuthSession />
            <AppShell
                brand={<SidebarBrand caption="Sistema imobiliário" href="/" icon={Building2} title="IA Imob" />}
                navigation={<AppNavigation />}
                sidebarFooter={<SidebarUserCard />}
                topbar={<AppBreadcrumbs />}
                topbarActions={
                    <>
                        <ThemeToggle />
                        <UserNav />
                    </>
                }
            >
                {children}
            </AppShell>
        </>
    );
}
