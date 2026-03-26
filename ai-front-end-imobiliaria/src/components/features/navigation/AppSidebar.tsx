"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    Bot,
    Building2,
    CreditCard,
    LayoutDashboard,
    LogOut,
    ShieldCheck,
    Users,
} from "lucide-react";
import { toast } from "sonner";

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
import { useAuthStore } from "@/store/useAuthStore";
import { authService } from "@/services/authService";

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
        title: "Plano & Assinatura",
        href: "/billing",
        icon: CreditCard,
    },
];

// ---------------------------------------------------------------------------
// AppSidebar
// ---------------------------------------------------------------------------

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, clearAuth } = useAuthStore();

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error("Erro no logout via backend", error);
        } finally {
            clearAuth();
            // Clear session cookies manually to ensure middleware detects unauthenticated state
            document.cookie = "laravel_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            // Hard redirect to force full page reload and clear cached state
            window.location.href = "/login";
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
                            {navItems.map((item) => {
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
                    {user && (
                        <SidebarMenuItem>
                            <div className="flex flex-col gap-0.5 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
                                <span className="text-sm font-medium truncate">
                                    {user.name}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                    {user.email}
                                </span>
                            </div>
                        </SidebarMenuItem>
                    )}
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Sair"
                            onClick={handleLogout}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <LogOut />
                            <span>Sair da conta</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    );
}

