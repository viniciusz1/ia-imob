import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: ReactNode;
    action?: ReactNode;
    /**
     * "card" is a standalone dashed card for an empty page; "inline" sits
     * inside an existing card or list.
     */
    variant?: "card" | "inline";
    className?: string;
}

/**
 * Empty state. "Create" buttons live in the page header and are not repeated
 * here; `action` is for secondary actions such as clearing a filter.
 */
export function EmptyState({ icon: Icon, title, description, action, variant = "card", className }: EmptyStateProps) {
    if (variant === "inline") {
        return (
            <div className={cn("flex flex-col items-center justify-center px-4 py-10 text-center", className)}>
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                </div>
                <p className="mt-3 text-sm text-foreground">{title}</p>
                {description && <div className="mt-1 max-w-xs text-xs text-muted-foreground">{description}</div>}
                {action && <div className="mt-4">{action}</div>}
            </div>
        );
    }

    return (
        <Card className={cn("items-center justify-center gap-0 border-dashed py-16 shadow-none", className)}>
            <div className="flex size-14 items-center justify-center rounded-full bg-muted">
                <Icon className="size-7 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg text-foreground">{title}</h3>
            {description && (
                <div className="mt-1.5 max-w-sm px-4 text-center text-sm text-muted-foreground">{description}</div>
            )}
            {action && <div className="mt-4">{action}</div>}
        </Card>
    );
}
