"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ToggleGroupContextValue {
  value?: string
  onValueChange?: (value: string) => void
}

const ToggleGroupContext = React.createContext<ToggleGroupContextValue>({})

function ToggleGroup({
  className,
  value,
  onValueChange,
  children,
  ...props
}: Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> & {
  type?: "single"
  value?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div
        data-slot="toggle-group"
        className={cn(
          "inline-flex items-center gap-1 rounded-xl bg-segment p-1.5 text-segment-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  )
}

function ToggleGroupItem({
  className,
  value: itemValue,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  value: string
}) {
  const { value: selectedValue, onValueChange } = React.useContext(ToggleGroupContext)
  const isSelected = selectedValue === itemValue

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      data-slot="toggle-group-item"
      data-state={isSelected ? "on" : "off"}
      className={cn(
        "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg px-3 text-[0.8125rem] font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected && "bg-segment-active text-segment-active-foreground shadow-xs",
        !isSelected && "hover:text-foreground",
        className
      )}
      onClick={() => onValueChange?.(itemValue)}
      {...props}
    >
      {children}
    </button>
  )
}

export { ToggleGroup, ToggleGroupItem }
