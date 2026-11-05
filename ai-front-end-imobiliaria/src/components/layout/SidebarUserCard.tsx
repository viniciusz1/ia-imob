"use client";

import { useSidebarCollapsed } from "@/components/layout/SidebarNav";
import { useAuthStore } from "@/store/useAuthStore";

export function initialsOf(name: string | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase() || "?";
}

/** Signed-in user pinned to the bottom of the sidebar; just the avatar tile in the rail. */
export function SidebarUserCard({ roleLabel }: { roleLabel?: string }) {
    const user = useAuthStore((state) => state.user);
    const collapsed = useSidebarCollapsed();

    if (!user) return null;

    const avatar = (
        <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-sidebar-accent text-sm font-semibold text-sidebar-highlight"
        >
            {initialsOf(user.name)}
        </span>
    );

    if (collapsed) {
        return (
            <div className="flex justify-center" title={`${user.name} · ${roleLabel ?? user.email}`}>
                {avatar}
                <span className="sr-only">{user.name}</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/60 p-2">
            {avatar}
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-xs text-sidebar-muted">{roleLabel ?? user.email}</p>
            </div>
        </div>
    );
}
