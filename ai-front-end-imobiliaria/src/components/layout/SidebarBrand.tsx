import Image from "next/image";

import { SidebarBrandFrame } from "@/components/layout/SidebarNav";

interface SidebarBrandProps {
    href: string;
    /** Accessible name of the home link, e.g. "Início do CRM". */
    title: string;
    /** Area shown next to the logo when the sidebar is expanded. */
    caption?: string;
}

/**
 * Product logo at the top of the sidebar: only the logo in the rail, the logo
 * plus the area name when expanded. Server-safe; the client frame knows
 * whether the rail is collapsed.
 */
export function SidebarBrand({ href, title, caption }: SidebarBrandProps) {
    return (
        <SidebarBrandFrame
            caption={caption}
            href={href}
            mark={<Image alt="" className="size-10 shrink-0" height={512} priority src="/logo.png" width={512} />}
            title={title}
        />
    );
}
