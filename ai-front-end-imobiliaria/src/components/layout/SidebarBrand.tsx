import Image from "next/image";
import Link from "next/link";

interface SidebarBrandProps {
    href: string;
    /** Small caption under the logo, e.g. "Administração". */
    caption?: string;
}

/** Prospectai wordmark rendered in white over the brand-colored sidebar. */
export function SidebarBrand({ href, caption }: SidebarBrandProps) {
    return (
        <Link
            className="flex min-w-0 flex-col gap-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
            href={href}
        >
            <Image
                alt="Prospectai"
                className="h-6 w-auto max-w-[150px] object-contain object-left brightness-0 invert"
                height={200}
                priority
                src="/prospectai-logo-dark.png"
                width={825}
            />
            {caption && <span className="truncate text-xs leading-none text-sidebar-muted">{caption}</span>}
        </Link>
    );
}
