"use client";

import { ChevronRight, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { SidebarCollapsedContext } from "@/components/layout/SidebarNav";
import { cn } from "@/lib/utils";

const MAIN_ID = "app-main";
const COLLAPSED_STORAGE_KEY = "app-sidebar-collapsed";

/** Scrolls the content area to the top; the shell scrolls <main>, not the window. */
export function scrollAppToTop(behavior: ScrollBehavior = "smooth") {
    const main = document.getElementById(MAIN_ID);
    if (main?.scrollTo) main.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
}

function readCollapsedPreference(): boolean {
    try {
        return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) !== "0";
    } catch {
        return true;
    }
}

const COLLAPSED_CHANGE_EVENT = "app-sidebar-collapsed-change";

function storeCollapsedPreference(collapsed: boolean) {
    try {
        window.localStorage.setItem(COLLAPSED_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
        // Storage unavailable (private window); the choice just isn't remembered.
    }
    window.dispatchEvent(new Event(COLLAPSED_CHANGE_EVENT));
}

function subscribeToCollapsedPreference(onChange: () => void) {
    window.addEventListener(COLLAPSED_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
        window.removeEventListener(COLLAPSED_CHANGE_EVENT, onChange);
        window.removeEventListener("storage", onChange);
    };
}

interface AppShellProps {
    /** Logo and product name shown at the top of the sidebar. */
    brand: ReactNode;
    /** Sidebar navigation; rendered in a scrollable column. */
    navigation: ReactNode;
    /** Pinned to the bottom of the sidebar (user card, back link...). */
    sidebarFooter?: ReactNode;
    /** Left side of the topbar: the module title and its tabs. */
    topbar?: ReactNode;
    /** Right side of the topbar, usually the user menu. */
    topbarActions?: ReactNode;
    children: ReactNode;
}

/**
 * The authenticated application frame, after the Hubstrom layout: a dark
 * 80px icon rail (expandable to show labels), a topbar band with the
 * module title (88px, as the reference page header bar), and the scrolling
 * content area on the lighter page color with the 32px page gutter.
 *
 * Below `lg` the sidebar is an off-canvas drawer, always shown with labels.
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
    // The server always renders the rail; the stored choice applies once hydrated.
    const collapsedPreference = useSyncExternalStore(
        subscribeToCollapsedPreference,
        readCollapsedPreference,
        () => true,
    );
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

    // The mobile drawer always shows labels; the rail is a desktop layout.
    const collapsed = collapsedPreference && !sidebarOpen;

    const toggleCollapsed = () => storeCollapsedPreference(!collapsedPreference);

    return (
        <SidebarCollapsedContext.Provider value={collapsed}>
            <div className="flex h-svh overflow-hidden bg-background">
                {sidebarOpen && (
                    <div
                        aria-hidden="true"
                        className="fixed inset-0 z-40 bg-black/60 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-200 lg:static lg:translate-x-0",
                        collapsed ? "w-20" : "w-64",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full",
                    )}
                >
                    <div
                        className={cn(
                            "relative flex h-[5.5rem] shrink-0 items-center border-b border-sidebar-border",
                            collapsed ? "justify-center px-0" : "gap-3 px-5",
                        )}
                    >
                        {brand}
                        <button
                            aria-label="Fechar menu"
                            className="ml-auto rounded-md p-1 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                            type="button"
                        >
                            <X className="size-5" />
                        </button>
                        <button
                            aria-expanded={!collapsed}
                            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
                            className="absolute top-full right-0 z-10 hidden size-6 translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-muted transition-colors hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 lg:flex"
                            onClick={toggleCollapsed}
                            type="button"
                        >
                            <ChevronRight className={cn("size-3.5 transition-transform", !collapsed && "rotate-180")} />
                        </button>
                    </div>

                    <div className={cn("flex-1 overflow-x-hidden overflow-y-auto py-5", collapsed ? "px-0" : "px-3")}>
                        {navigation}
                    </div>

                    {sidebarFooter && (
                        <div className={cn("shrink-0 border-t border-sidebar-border py-3", collapsed ? "px-0" : "px-3")}>
                            {sidebarFooter}
                        </div>
                    )}
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="flex h-[5.5rem] shrink-0 items-center gap-3 border-b border-border bg-topbar px-4 text-topbar-foreground sm:gap-4 sm:px-6 lg:px-8">
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
                        className="min-h-0 flex-1 overflow-auto overscroll-contain bg-background p-4 [scrollbar-gutter:stable] sm:p-6 lg:p-8"
                        id={MAIN_ID}
                        ref={mainRef}
                    >
                        <div className="animate-in fade-in-0 duration-200">{children}</div>
                    </main>
                </div>
            </div>
        </SidebarCollapsedContext.Provider>
    );
}
