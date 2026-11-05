import { cn } from "@/lib/utils";

/** A required field of a form: its label as shown to the user and whether it is filled and valid. */
export type RequiredField = readonly [label: string, ok: boolean];

/** Labels of the required fields that are still empty or invalid, in form order. */
export function missingFields(fields: readonly RequiredField[]): string[] {
  return fields.filter(([, ok]) => !ok).map(([label]) => label);
}

export function isFilled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Same rule as `<input type="url">`: an absolute http(s) address. */
export function isValidUrl(value: string | null | undefined): boolean {
  if (!isFilled(value)) return false;
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Integer within [min, max] typed into a text/number field. */
export function isIntegerInRange(value: string | number | null | undefined, min: number, max: number): boolean {
  if (value === null || value === undefined || value === "") return false;
  const number = typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(number) && number >= min && number <= max;
}

/**
 * Explains why the primary action next to it is disabled: "Preencha: Cidade, UF".
 * Renders nothing when every required field is filled, so it never shows red
 * errors on fields the user has not touched.
 */
export function MissingFieldsHint({ missing, className }: { missing: string[]; className?: string }) {
  if (missing.length === 0) return null;

  return (
    <p className={cn("text-[0.8125rem] text-subtle", className)} role="status">
      Preencha: {missing.join(", ")}
    </p>
  );
}
