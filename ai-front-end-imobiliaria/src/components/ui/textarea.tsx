import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-lg border border-input bg-field px-3.5 py-3 text-sm shadow-xs shadow-black/5 transition-colors outline-none placeholder:text-muted-foreground hover:border-muted-foreground/30 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
