"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface MultiSelectFilterProps<TValue extends string | number> {
  label: string;
  placeholder: string;
  values: TValue[];
  selected: TValue[];
  onChange: (selected: TValue[]) => void;
  renderLabel?: (value: TValue) => string;
}

export function MultiSelectFilter<TValue extends string | number>({
  label,
  placeholder,
  values,
  selected,
  onChange,
  renderLabel,
}: MultiSelectFilterProps<TValue>) {
  const display = (value: TValue) => (renderLabel ? renderLabel(value) : String(value));

  const toggle = (value: TValue) =>
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? display(selected[0])
        : `${selected.length} selecionados`;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full min-w-0 justify-between border-input bg-transparent font-normal hover:bg-accent/50 dark:bg-input/30 dark:hover:bg-input/50"
            disabled={values.length === 0}
          >
            <span
              className={cn("truncate", selected.length === 0 && "text-muted-foreground")}
              title={summary}
            >
              {summary}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
          <ScrollArea className="max-h-64">
            {values.map((value) => (
              <DropdownMenuCheckboxItem
                key={String(value)}
                checked={selected.includes(value)}
                onCheckedChange={() => toggle(value)}
                onSelect={(event) => event.preventDefault()}
              >
                {display(value)}
              </DropdownMenuCheckboxItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
