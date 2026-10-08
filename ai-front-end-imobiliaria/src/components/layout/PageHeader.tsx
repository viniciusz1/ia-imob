import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    /** Buttons on the right (primary action last). */
    actions?: ReactNode;
    /** Content next to the title, e.g. a status badge. */
    badge?: ReactNode;
    /** Shows a back button next to the title (detail and edit screens). */
    backHref?: string;
}

/**
 * The single page-title treatment. Every screen starts with one, inside a
 * `space-y-6` page wrapper.
 */
export function PageHeader({ title, description, actions, badge, backHref }: PageHeaderProps) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="flex min-w-0 items-start gap-3">
                {backHref && (
                    <Button asChild className="shrink-0" size="icon" title="Voltar" variant="ghost">
                        <Link aria-label="Voltar" href={backHref}>
                            <ArrowLeft />
                        </Link>
                    </Button>
                )}
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
                        {badge}
                    </div>
                    {description && <div className="text-sm text-muted-foreground">{description}</div>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
