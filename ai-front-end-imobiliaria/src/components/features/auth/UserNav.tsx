"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useSidebarCollapsed } from "@/components/layout/SidebarNav";
import { SidebarUserCard } from "@/components/layout/SidebarUserCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { authService } from "@/services/authService";
import { clearAuthenticatedSession } from "@/services/authSessionCookie";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Account block at the bottom of the sidebar: who is signed in and a visible
 * "Sair" button (it used to hide inside an avatar menu in the topbar).
 */
export function UserNav({ roleLabel }: { roleLabel?: string }) {
    const clearAuth = useAuthStore((state) => state.clearAuth);
    const router = useRouter();
    const queryClient = useQueryClient();
    const collapsed = useSidebarCollapsed();

    const handleLogout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error("Erro no logout via backend", error);
        } finally {
            clearAuthenticatedSession();
            clearAuth(); // Limpa Zustand store
            queryClient.clear(); // Limpa cache do React Query
            router.push("/login");
            toast.success("Desconectado com sucesso.");
        }
    };

    const button = (
        <button
            aria-label="Sair da conta"
            className={cn(
                "flex shrink-0 cursor-pointer items-center justify-center rounded-lg text-sidebar-muted transition-colors hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
                collapsed ? "size-11" : "size-9",
            )}
            onClick={() => void handleLogout()}
            type="button"
        >
            <LogOut className="size-[1.125rem]" />
        </button>
    );

    return (
        <SidebarUserCard
            action={
                <TooltipProvider delayDuration={150}>
                    <Tooltip>
                        <TooltipTrigger asChild>{button}</TooltipTrigger>
                        <TooltipContent side={collapsed ? "right" : "top"} sideOffset={8}>
                            Sair da conta
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            }
            roleLabel={roleLabel}
        />
    );
}
