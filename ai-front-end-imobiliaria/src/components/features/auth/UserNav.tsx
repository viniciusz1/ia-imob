"use client";

import { useAuthStore } from "../../../store/useAuthStore";
import { authService } from "../../../services/authService";
import { clearAuthenticatedSession } from "../../../services/authSessionCookie";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

import { initialsOf } from "@/components/layout/SidebarUserCard";
import { Button } from "../../ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../../ui/dropdown-menu";

export function UserNav() {
    const { user, clearAuth } = useAuthStore();
    const router = useRouter();
    const queryClient = useQueryClient();

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

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button aria-label="Menu da conta" className="rounded-full" size="icon" variant="ghost">
                    <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs text-foreground">
                        {initialsOf(user.name)}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                        <p className="truncate text-sm leading-none">{user.name}</p>
                        <p className="truncate text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} variant="destructive">
                    <LogOut />
                    Sair da conta
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
