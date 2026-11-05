import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface SidebarBrandProps {
    href: string;
    icon: LucideIcon;
    title: string;
    /** Small caption under the title, e.g. "Administração da plataforma". */
    caption?: string;
}

/** Product name and area at the top of the sidebar. */
export function SidebarBrand({ href, icon: Icon, title, caption }: SidebarBrandProps) {
    return (
        <Link
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
            href={href}
        >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-highlight/15">
                <Icon className="size-5 text-sidebar-highlight" />
            </span>
            <span className="min-w-0">
                <span className="block truncate text-base leading-tight font-semibold text-sidebar-foreground">{title}</span>
                {caption && <span className="block truncate text-xs text-sidebar-muted">{caption}</span>}
            </span>
        </Link>
    );
}
