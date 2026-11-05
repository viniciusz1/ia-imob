"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"

/**
 * Numeric fields that format pt-BR while typing ("1.234.567,89") but hand the
 * form a plain `number | null`. They render the regular Input, so they keep
 * the 44px field look and work with react-hook-form's Controller
 * (`value` + `onValueChange` + `onBlur` + `ref`).
 */

type BaseInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "defaultValue" | "onChange" | "type" | "inputMode"
>

interface NumberFieldProps extends BaseInputProps {
  value: number | null | undefined
  onValueChange: (value: number | null) => void
}

const groupFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })

function groupDigits(digits: string, grouping: boolean): string {
  if (!digits) return ""
  const trimmed = digits.replace(/^0+(?=\d)/, "")
  return grouping ? groupFormatter.format(BigInt(trimmed)) : trimmed
}

/** Keeps local text in sync when the form value changes from outside (reset, CEP lookup...). */
function useSyncedText(value: number | null | undefined, format: (value: number | null) => string, parse: (text: string) => number | null) {
  const [text, setText] = React.useState(() => format(value ?? null))
  const [syncedValue, setSyncedValue] = React.useState<number | null>(value ?? null)
  const current = value ?? null

  if (current !== syncedValue) {
    setSyncedValue(current)
    if (current !== parse(text)) setText(format(current))
  }

  const commit = (nextText: string): number | null => {
    const next = parse(nextText)
    setText(nextText)
    setSyncedValue(next)
    return next
  }

  return [text, commit] as const
}

/* ----------------------------------------------------------------------------
 * Money: typed as cents, so digits shift in from the right (1 → 0,01 → 0,12 →
 * 1,23 → 12,34 …), the usual Brazilian money mask.
 * ------------------------------------------------------------------------- */

interface MoneyInputProps extends NumberFieldProps {
  /** Most integer digits accepted (12 → up to R$ 999.999.999.999,99). */
  maxIntegerDigits?: number
}

function formatMoney(value: number | null): string {
  if (value === null || Number.isNaN(value)) return ""
  const cents = Math.round(Math.abs(value) * 100).toString().padStart(3, "0")
  return `${groupDigits(cents.slice(0, -2), true)},${cents.slice(-2)}`
}

function parseMoney(text: string): number | null {
  const digits = text.replace(/\D/g, "")
  if (!digits) return null
  return Number(digits) / 100
}

function MoneyInput({ value, onValueChange, maxIntegerDigits = 12, ...props }: MoneyInputProps) {
  const [text, commit] = useSyncedText(value, formatMoney, parseMoney)

  return (
    <Input
      {...props}
      autoComplete="off"
      inputMode="numeric"
      onChange={(event) => {
        const digits = event.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, maxIntegerDigits + 2)
        const next = digits ? formatMoney(Number(digits) / 100) : ""
        onValueChange(commit(next))
      }}
      type="text"
      value={text}
    />
  )
}

/* ----------------------------------------------------------------------------
 * Decimal: free typing with "," as the decimal separator and "." grouping the
 * thousands. A "." typed at the end becomes the decimal comma, and a pasted
 * "-26.4851" is read as a decimal too.
 * ------------------------------------------------------------------------- */

interface DecimalInputProps extends NumberFieldProps {
  /** Most digits after the comma. */
  decimals?: number
  maxIntegerDigits?: number
  allowNegative?: boolean
  /** Group thousands with "." (off for coordinates). */
  grouping?: boolean
}

function DecimalInput({
  value,
  onValueChange,
  decimals = 2,
  maxIntegerDigits = 9,
  allowNegative = false,
  grouping = true,
  ...props
}: DecimalInputProps) {
  const format = React.useCallback(
    (next: number | null) => {
      if (next === null || Number.isNaN(next)) return ""
      const negative = next < 0
      const [integer, fraction = ""] = Math.abs(next).toFixed(decimals).split(".")
      const trimmedFraction = fraction.replace(/0+$/, "")
      return `${negative ? "-" : ""}${groupDigits(integer, grouping)}${trimmedFraction ? `,${trimmedFraction}` : ""}`
    },
    [decimals, grouping]
  )

  const parse = React.useCallback((input: string): number | null => {
    const negative = input.trim().startsWith("-")
    const [integer = "", fraction = ""] = input.replace(/[^\d,]/g, "").split(",")
    if (!integer && !fraction) return null
    const parsed = Number(`${integer || "0"}.${fraction || "0"}`)
    if (Number.isNaN(parsed)) return null
    return negative ? -parsed : parsed
  }, [])

  const [text, commit] = useSyncedText(value, format, parse)

  function normalize(raw: string): string {
    let working = raw
    const typedDotAtEnd = raw.length === text.length + 1 && raw.endsWith(".") && !text.includes(",")
    const pastedDecimal = /^-?\d+\.\d+$/.test(raw.trim())
    if ((typedDotAtEnd || pastedDecimal) && decimals > 0) {
      const last = working.lastIndexOf(".")
      working = `${working.slice(0, last)},${working.slice(last + 1)}`
    }

    const negative = allowNegative && working.trim().startsWith("-")
    const cleaned = working.replace(/[^\d,]/g, "")
    const commaIndex = cleaned.indexOf(",")
    const integerDigits = (commaIndex === -1 ? cleaned : cleaned.slice(0, commaIndex)).slice(0, maxIntegerDigits)
    const fractionDigits = commaIndex === -1 ? null : cleaned.slice(commaIndex + 1).replace(/,/g, "").slice(0, decimals)

    const integerText = integerDigits ? groupDigits(integerDigits, grouping) : fractionDigits !== null ? "0" : ""
    const body = fractionDigits === null || decimals === 0 ? integerText : `${integerText},${fractionDigits}`
    return `${negative ? "-" : ""}${body}`
  }

  return (
    <Input
      {...props}
      autoComplete="off"
      inputMode="decimal"
      onChange={(event) => onValueChange(commit(normalize(event.target.value)))}
      type="text"
      value={text}
    />
  )
}

/* ----------------------------------------------------------------------------
 * Integer: digits only, capped by length (a year never takes a fifth digit).
 * ------------------------------------------------------------------------- */

interface IntegerInputProps extends NumberFieldProps {
  maxDigits?: number
  allowNegative?: boolean
  /** Group thousands with "." (off for years). */
  grouping?: boolean
}

function IntegerInput({
  value,
  onValueChange,
  maxDigits = 4,
  allowNegative = false,
  grouping = false,
  ...props
}: IntegerInputProps) {
  const format = React.useCallback(
    (next: number | null) => {
      if (next === null || Number.isNaN(next)) return ""
      return `${next < 0 ? "-" : ""}${groupDigits(Math.abs(Math.trunc(next)).toString(), grouping)}`
    },
    [grouping]
  )

  const parse = React.useCallback((input: string): number | null => {
    const digits = input.replace(/\D/g, "")
    if (!digits) return null
    const parsed = Number(digits)
    return input.trim().startsWith("-") ? -parsed : parsed
  }, [])

  const [text, commit] = useSyncedText(value, format, parse)

  return (
    <Input
      {...props}
      autoComplete="off"
      inputMode="numeric"
      onChange={(event) => {
        const raw = event.target.value
        const negative = allowNegative && raw.trim().startsWith("-")
        const digits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, maxDigits)
        const body = digits ? groupDigits(digits, grouping) : ""
        onValueChange(commit(`${negative ? "-" : ""}${body}`))
      }}
      type="text"
      value={text}
    />
  )
}

export { DecimalInput, IntegerInput, MoneyInput }
