"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SwitchTileProps {
    id: string;
    title: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    className?: string;
}

/** On/off option shown as a filled tile (tinted green while on): label and help text on the left, switch on the right. */
export function SwitchTile({ id, title, description, checked, onCheckedChange, className }: SwitchTileProps) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 rounded-xl bg-muted px-4 py-3.5 transition-colors has-[[data-state=checked]]:bg-primary/10 has-[[data-state=checked]]:ring-1 has-[[data-state=checked]]:ring-primary/40",
                className,
            )}
        >
            <div className="min-w-0 space-y-1.5">
                <Label className="text-sm text-foreground" htmlFor={id}>
                    {title}
                </Label>
                <p className="text-[0.8125rem] leading-4 text-subtle">{description}</p>
            </div>
            <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
        </div>
    );
}
