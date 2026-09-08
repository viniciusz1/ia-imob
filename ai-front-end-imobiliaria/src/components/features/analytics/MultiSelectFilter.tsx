"use client";

import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

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
            className="w-full justify-between border-input bg-transparent font-normal hover:bg-accent/50 dark:bg-input/30 dark:hover:bg-input/50"
            disabled={values.length === 0}
          >
            <span className={selected.length === 0 ? "text-muted-foreground" : undefined}>
              {summary}
            </span>
            <ChevronDown className="h-4 w-4 opacity-50" />
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

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge key={String(value)} variant="secondary" className="gap-1 pr-1">
              {display(value)}
              <button
                type="button"
                aria-label={`Remover ${display(value)}`}
                onClick={() => toggle(value)}
                className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
