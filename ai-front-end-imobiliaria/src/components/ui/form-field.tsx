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

/**
 * Label, control and message stacked with the standard spacing. With an
 * `error`, the control gets a red border (see globals.css) and is marked
 * `aria-invalid` with the message as its description.
 */
function FormField({
  htmlFor,
  label,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`
  const invalid = Boolean(error)
  const control =
    invalid && React.isValidElement<{ "aria-invalid"?: boolean; "aria-describedby"?: string }>(children)
      ? React.cloneElement(children, {
          "aria-invalid": children.props["aria-invalid"] ?? true,
          "aria-describedby": children.props["aria-describedby"] ?? errorId,
        })
      : children

  return (
    <div className={cn("space-y-2", className)} data-invalid={invalid || undefined} data-slot="form-field">
      <Label className={cn(invalid && "text-destructive")} htmlFor={htmlFor}>
        {label}
        {required && <span className="-ml-1.5 text-destructive">*</span>}
      </Label>
      {control}
      {error ? (
        <p className="text-xs text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

export { FormField }
