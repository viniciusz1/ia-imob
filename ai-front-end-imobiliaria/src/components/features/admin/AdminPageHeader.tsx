import type { ReactNode } from "react";

interface AdminPageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
}

/**
 * The single page-title treatment for the Admin Area.
 *
 * Every screen under /admin uses `text-2xl font-semibold` for its title and an
 * unsized muted paragraph for its description — the Crawler module already set
 * that precedent, so this component exists to keep new screens from drifting
 * into their own sizes and weights.
 */
export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold">{title}</h1>
                {description && <p className="text-muted-foreground">{description}</p>}
            </div>

            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
