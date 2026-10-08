"use client"

import * as React from "react"
import { ptBR } from "date-fns/locale"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Month calendar in pt-BR with the design system's buttons and tints. */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn("w-fit", className)}
      classNames={{
        months: "relative flex flex-col gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center px-10",
        caption_label: "text-sm text-foreground first-letter:uppercase",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground"),
        button_next: cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-muted-foreground"),
        month_grid: "border-collapse",
        weekdays: "flex",
        weekday: "w-9 pb-1 text-center text-xs text-muted-foreground uppercase",
        week: "mt-1 flex",
        day: "size-9 p-0 text-center text-sm",
        day_button:
          "inline-flex size-9 cursor-pointer items-center justify-center rounded-lg tabular-nums transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90",
        today: "[&>button]:text-primary [&>button]:ring-1 [&>button]:ring-primary/30",
        outside: "text-muted-foreground/50",
        disabled: "pointer-events-none opacity-40",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  )
}

export { Calendar }
