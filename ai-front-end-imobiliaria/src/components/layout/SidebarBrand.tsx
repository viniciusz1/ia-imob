import type { LucideIcon } from "lucide-react";

import { SidebarBrandFrame } from "@/components/layout/SidebarNav";

interface SidebarBrandProps {
    href: string;
    icon: LucideIcon;
    title: string;
    /** Small caption under the title, e.g. "Administração da plataforma". */
    caption?: string;
}

/**
 * Product mark at the top of the sidebar; only the green mark in the rail.
 * Stays a server-safe component (layouts pass it a Lucide icon) and hands the
 * rendered mark to the client frame that knows whether the rail is collapsed.
 */
export function SidebarBrand({ href, icon: Icon, title, caption }: SidebarBrandProps) {
    return (
        <SidebarBrandFrame
            caption={caption}
            href={href}
            mark={
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-highlight/15">
                    <Icon className="size-[1.375rem] text-sidebar-highlight" strokeWidth={2} />
                </span>
            }
            title={title}
        />
    );
}
