"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
    Bot,
    Building2,
    Calculator,
    CreditCard,
    Database,
    Globe,
    LayoutDashboard,
    Loader2,
    LogOut,
    ShieldCheck,
    Users,
} from "lucide-react";

import { authService } from "@/services/authService";
import { clearAuthenticatedSession } from "@/services/authSessionCookie";
import { useAuthStore } from "@/store/useAuthStore";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar";

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const navItems = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        title: "Imóveis",
        href: "/properties",
        icon: Building2,
    },
    {
        title: "Usuários",
        href: "/usuarios",
        icon: Users,
    },
    {
        title: "Grupos",
        href: "/grupos",
        icon: ShieldCheck,
    },
    {
        title: "Buscador com IA",
        href: "/ai-searcher",
        icon: Bot,
    },
    {
        title: "Avaliar imóvel",
        href: "/avaliacoes",
        icon: Calculator,
        permissions: ["valuations.create", "valuations.view"],
    },
    {
        title: "Agências importadas",
        href: "/agencias-importadas",
        icon: Database,
    },
    {
        title: "Plano & Assinatura",
        href: "/billing",
        icon: CreditCard,
    },
    {
        title: "Configurações do site",
        href: "/configuracoes-do-site",
        icon: Globe,
    },
];

// ---------------------------------------------------------------------------
// AppSidebar
// ---------------------------------------------------------------------------

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const queryClient = useQueryClient();
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const user = useAuthStore((state) => state.user);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const userPermissions = Array.isArray(user?.permissions) ? user.permissions : null;
    const visibleNavItems = navItems.filter((item) => {
        if (!("permissions" in item) || !item.permissions) {
            return true;
        }

        if (userPermissions === null) {
            return true;
        }

        return item.permissions.some((permission) => userPermissions.includes(permission));
    });

    const handleLogout = async () => {
        if (isLoggingOut) return;

        setIsLoggingOut(true);
        try {
            await authService.logout();
        } catch (error) {
            console.error("Erro no logout via backend", error);
        } finally {
            clearAuthenticatedSession();
            clearAuth();
            queryClient.clear();
            router.push("/login");
            toast.success("Desconectado com sucesso.");
            setIsLoggingOut(false);
        }
    };

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className="border-b border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Building2 className="size-4" />
                                </div>
                                <div className="flex flex-col gap-0.5 leading-none">
                                    <span className="font-semibold">
                                        IA Imob
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        Sistema Imobiliário
                                    </span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navegação</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {visibleNavItems.map((item) => {
                                const isActive =
                                    pathname === item.href ||
                                    (item.href !== "/" &&
                                        pathname.startsWith(item.href));

                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={isActive}
                                            tooltip={item.title}
                                        >
                                            <Link href={item.href}>
                                                <item.icon />
                                                <span>{item.title}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            type="button"
                            tooltip="Sair da conta"
                            disabled={isLoggingOut}
                            onClick={handleLogout}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            {isLoggingOut ? (
                                <Loader2 className="animate-spin" />
                            ) : (
                                <LogOut />
                            )}
                            <span>{isLoggingOut ? "Saindo..." : "Sair da conta"}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}
