"use client"

import * as React from "react"
import { format, isValid, parse } from "date-fns"
import { CalendarDays, X } from "lucide-react"

import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const DATE_FORMAT = "yyyy-MM-dd"
const DATE_TIME_FORMAT = "yyyy-MM-dd'T'HH:mm"

interface DatePickerProps {
  id?: string
  /** `YYYY-MM-DD`, or `YYYY-MM-DDTHH:mm` with `withTime`; empty when unset. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Adds a time field under the calendar (replaces `datetime-local`). */
  withTime?: boolean
  size?: "sm" | "default"
  disabled?: boolean
  className?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
}

function parseValue(value: string, withTime: boolean): Date | undefined {
  if (!value) return undefined
  const date = parse(value, withTime ? DATE_TIME_FORMAT : DATE_FORMAT, new Date())
  return isValid(date) ? date : undefined
}

/**
 * Date field with a pt-BR calendar popover. Looks like Input and keeps the
 * same string values as the native date inputs it replaces.
 */
function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Selecione uma data",
  withTime = false,
  size = "default",
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseValue(value, withTime)
  const time = selected && withTime ? format(selected, "HH:mm") : "00:00"

  const emit = (date: Date | undefined, nextTime = time) => {
    if (!date) {
      onChange("")
      return
    }
    if (!withTime) {
      onChange(format(date, DATE_FORMAT))
      return
    }
    const [hours, minutes] = nextTime.split(":").map(Number)
    const withHours = new Date(date)
    withHours.setHours(hours || 0, minutes || 0, 0, 0)
    onChange(format(withHours, DATE_TIME_FORMAT))
  }

  const label = selected
    ? format(selected, withTime ? "dd/MM/yyyy 'às' HH:mm" : "dd/MM/yyyy")
    : placeholder

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <div className={cn("relative w-full min-w-0", className)} data-slot="date-picker">
        <PopoverTrigger asChild>
          <button
            aria-label={ariaLabel}
            className={cn(
              "flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background pr-9 pl-3 text-left text-sm shadow-xs shadow-black/5 transition-colors outline-none hover:border-muted-foreground/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 data-invalid:border-destructive data-[state=open]:border-ring data-[state=open]:ring-2 data-[state=open]:ring-ring/20 dark:bg-input/30",
              size === "sm" ? "h-9" : "h-10"
            )}
            data-invalid={ariaInvalid || undefined}
            disabled={disabled}
            id={id}
            type="button"
          >
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate tabular-nums", !selected && "text-muted-foreground")}>{label}</span>
          </button>
        </PopoverTrigger>
        {selected && !disabled && (
          <button
            aria-label="Limpar data"
            className="absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => emit(undefined)}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-3">
        <Calendar
          autoFocus
          defaultMonth={selected}
          mode="single"
          onSelect={(date) => {
            emit(date)
            if (!withTime) setOpen(false)
          }}
          selected={selected}
        />
        {withTime && (
          <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Horário</span>
            <Input
              aria-label="Horário"
              className="w-28"
              disabled={!selected}
              onChange={(event) => emit(selected, event.target.value)}
              size="sm"
              type="time"
              value={time}
            />
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
