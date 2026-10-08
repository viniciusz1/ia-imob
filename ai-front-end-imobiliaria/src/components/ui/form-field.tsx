import * as React from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface FormFieldProps {
  /** id of the control, so the label is associated with it. */
  htmlFor: string
  label: React.ReactNode
  required?: boolean
  /** Helper text under the control; replaced by the error when present. */
  hint?: React.ReactNode
  error?: React.ReactNode
  className?: string
  children: React.ReactNode
}

/** Label, control and message stacked with the standard spacing. */
function FormField({
  htmlFor,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)} data-slot="form-field">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="-ml-1.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export { FormField }
