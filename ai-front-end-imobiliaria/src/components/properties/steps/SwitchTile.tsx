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

/** On/off option shown as a bordered tile: label and help text on the left, switch on the right. */
export function SwitchTile({ id, title, description, checked, onCheckedChange, className }: SwitchTileProps) {
    return (
        <div className={cn("flex items-center justify-between gap-4 rounded-lg border p-4", className)}>
            <div className="min-w-0 space-y-0.5">
                <Label className="text-sm text-foreground" htmlFor={id}>
                    {title}
                </Label>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} id={id} onCheckedChange={onCheckedChange} />
        </div>
    );
}
