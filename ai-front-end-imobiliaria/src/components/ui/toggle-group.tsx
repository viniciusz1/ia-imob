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
          "inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5 text-muted-foreground",
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
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isSelected && "bg-background text-foreground shadow-sm",
        !isSelected && "hover:bg-background/50 hover:text-foreground",
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
