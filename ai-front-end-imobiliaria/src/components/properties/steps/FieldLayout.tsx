import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface InputAdornmentProps {
    /** Text inside the field on the left, e.g. "R$". Give the input `pl-11`. */
    prefix?: string;
    /** Text inside the field on the right, e.g. "m²". Give the input `pr-12`. */
    suffix?: string;
    children: ReactNode;
}

/** Wraps an input to show a unit inside it without changing the input itself. */
export function InputAdornment({ prefix, suffix, children }: InputAdornmentProps) {
    return (
        <div className="relative">
            {prefix && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sm font-medium text-muted-foreground"
                >
                    {prefix}
                </span>
            )}
            {children}
            {suffix && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm font-medium text-muted-foreground"
                >
                    {suffix}
                </span>
            )}
        </div>
    );
}

/** Small uppercase heading that splits a long card into groups of fields. */
export function FieldGroupTitle({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <p className={cn("text-xs font-semibold tracking-wider text-subtle uppercase", className)}>{children}</p>
    );
}
