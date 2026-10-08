"use client"

import * as React from "react"
import { X } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface FilterSelectOption {
  value: string
  label: string
}

interface FilterSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: FilterSelectOption[]
  /** The "no filter" value; choosing anything else marks the filter active. */
  emptyValue: string
  "aria-label": string
  placeholder?: string
  size?: "sm" | "default"
  /** Width and layout, e.g. `w-full sm:w-48`. */
  className?: string
}

/**
 * Select for toolbar filters. When a value is chosen the trigger is tinted
 * and gets its own clear button, so an active filter is obvious and can be
 * removed without opening the list.
 */
function FilterSelect({
  value,
  onValueChange,
  options,
  emptyValue,
  "aria-label": ariaLabel,
  placeholder,
  size = "sm",
  className,
}: FilterSelectProps) {
  const active = value !== emptyValue
  const activeLabel = options.find((option) => option.value === value)?.label

  return (
    <div className={cn("relative", className)} data-slot="filter-select">
      <Select onValueChange={onValueChange} value={value}>
        <SelectTrigger
          aria-label={ariaLabel}
          className={cn(
            "w-full",
            active &&
              "border-primary/40 bg-primary/5 pr-9 text-primary hover:border-primary/60 dark:bg-primary/10 [&>svg:last-child]:hidden"
          )}
          size={size}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {active && (
        <button
          aria-label={`Limpar filtro ${ariaLabel}${activeLabel ? `: ${activeLabel}` : ""}`}
          className="absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-primary hover:bg-primary/10"
          onClick={() => onValueChange(emptyValue)}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  )
}

export { FilterSelect, type FilterSelectOption }
