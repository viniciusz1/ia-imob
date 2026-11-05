
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
