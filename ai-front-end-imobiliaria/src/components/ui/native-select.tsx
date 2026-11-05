import * as React from "react"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * A native `<select>` styled like Input and SelectTrigger. Use it where the
 * Radix Select does not fit (plain forms, filters driven by `onChange`); it
 * keeps native keyboard, mobile and testing behavior.
 */
function NativeSelect({
  className,
  wrapperClassName,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & {
  size?: "sm" | "default"
  /** Width and layout belong on the wrapper, e.g. `sm:w-48`. */
  wrapperClassName?: string
}) {
  return (
    <div
      className={cn("relative w-full min-w-0", wrapperClassName)}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-input bg-field py-2 pr-10 pl-3.5 text-sm shadow-xs shadow-black/5 transition-colors outline-none hover:border-muted-foreground/30 disabled:cursor-not-allowed disabled:opacity-50",
          "data-[size=default]:h-11 data-[size=sm]:h-10",
          "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  )
}

export { NativeSelect }
