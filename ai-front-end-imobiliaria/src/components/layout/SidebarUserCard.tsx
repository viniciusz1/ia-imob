"use client";

import { useAuthStore } from "@/store/useAuthStore";

export function initialsOf(name: string | undefined): string {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0) ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
    return (first + last).toUpperCase() || "?";
}

/** Signed-in user summary pinned to the bottom of the sidebar. */
export function SidebarUserCard({ roleLabel }: { roleLabel?: string }) {
    const user = useAuthStore((state) => state.user);

    if (!user) return null;

    return (
        <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent p-2.5">
            <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-xs font-semibold text-sidebar-highlight"
            >
                {initialsOf(user.name)}
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
                <p className="truncate text-xs text-sidebar-muted">{roleLabel ?? user.email}</p>
            </div>
        </div>
    );
}
