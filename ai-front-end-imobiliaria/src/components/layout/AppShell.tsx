"use client";

import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AppShellProps {
    /** Logo and product name shown at the top of the sidebar. */
    brand: ReactNode;
    /** Sidebar navigation; rendered in a scrollable column. */
    navigation: ReactNode;
    /** Pinned to the bottom of the sidebar (user card, back link...). */
    sidebarFooter?: ReactNode;
    /** Left side of the topbar, usually breadcrumbs. */
    topbar?: ReactNode;
    /** Right side of the topbar, usually the user menu. */
    topbarActions?: ReactNode;
    children: ReactNode;
}

/**
 * The authenticated application frame: a brand-colored sidebar, a white
 * topbar and a scrolling content area with the standard page gutter.
 *
 * The sidebar is static from `lg` up and an off-canvas drawer below it. The
 * logo row and the topbar are both `h-16` so their bottom borders line up.
 */
export function AppShell({
    brand,
    navigation,
    sidebarFooter,
    topbar,
    topbarActions,
    children,
}: AppShellProps) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [lastPathname, setLastPathname] = useState(pathname);
    const mainRef = useRef<HTMLElement>(null);

    // Navigating closes the mobile drawer.
    if (pathname !== lastPathname) {
        setLastPathname(pathname);
        setSidebarOpen(false);
    }

    // main scrolls on its own, so a route change has to reset it explicitly.
    useEffect(() => {
        if (mainRef.current) mainRef.current.scrollTop = 0;
    }, [pathname]);

    return (
        <div className="flex h-svh overflow-hidden">
            {sidebarOpen && (
                <div
                    aria-hidden="true"
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
                    {brand}
                    <button
                        aria-label="Fechar menu"
                        className="ml-auto rounded-md p-1 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                        type="button"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-4">{navigation}</div>

                {sidebarFooter && (
                    <div className="shrink-0 border-t border-sidebar-border p-3">{sidebarFooter}</div>
                )}
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4 sm:h-16 sm:gap-4 sm:px-6">
                    <button
                        aria-label="Abrir menu"
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
                        onClick={() => setSidebarOpen(true)}
                        type="button"
                    >
                        <Menu className="size-5" />
                    </button>
                    <div className="min-w-0 flex-1">{topbar}</div>
                    {topbarActions && <div className="flex shrink-0 items-center gap-2">{topbarActions}</div>}
                </header>

                <main
                    className="min-h-0 flex-1 overflow-auto overscroll-contain bg-background p-4 sm:p-6 lg:p-8"
                    ref={mainRef}
                >
                    <div className="animate-in fade-in-0 duration-200">{children}</div>
                </main>
            </div>
        </div>
    );
}
