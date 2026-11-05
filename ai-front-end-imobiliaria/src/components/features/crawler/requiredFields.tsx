import { useCallback, useState } from "react";

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

/* ----------------------------------------------------------------------------
 * Field validators. Each returns the message to show under the field, or null
 * when the value is fine. They mirror the API rules (Laravel FormRequests in
 * app/Http/Requests/Crawler) so the form never sends what the API rejects.
 * ------------------------------------------------------------------------- */

export type FieldError = string | null;

interface TextRules {
  required?: boolean;
  min?: number;
  max?: number;
}

export function textError(value: string | null | undefined, { required = true, min, max }: TextRules = {}): FieldError {
  const text = (value ?? "").trim();
  if (!text) return required ? "Campo obrigatório." : null;
  if (min !== undefined && text.length < min) return `Informe pelo menos ${min} caracteres.`;
  if (max !== undefined && text.length > max) return `Use no máximo ${max} caracteres.`;
  return null;
}

/** Lowercase words joined by hyphens: "imobiliaria-centro". */
export function slugError(value: string | null | undefined): FieldError {
  const base = textError(value, { max: 255 });
  if (base) return base;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(value).trim())
    ? null
    : "Use letras minúsculas, números e hífens (ex.: imobiliaria-centro).";
}

export function urlError(value: string | null | undefined, { required = true }: { required?: boolean } = {}): FieldError {
  const text = (value ?? "").trim();
  if (!text) return required ? "Campo obrigatório." : null;
  if (text.length > 2048) return "Use no máximo 2048 caracteres.";
  return isValidUrl(text) ? null : "Informe um endereço completo começando com http:// ou https://.";
}

/** A bare host name: "imobiliaria.com.br" (no protocol, path or spaces). */
export function domainError(value: string | null | undefined): FieldError {
  const base = textError(value, { max: 255 });
  if (base) return base;
  const text = String(value).trim().toLowerCase();
  if (/^https?:\/\//.test(text) || text.includes("/")) return "Informe só o domínio, sem http:// e sem caminho.";
  return /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(text)
    ? null
    : "Domínio inválido (ex.: imobiliaria.com.br).";
}

export const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export function stateError(value: string | null | undefined, { required = true }: { required?: boolean } = {}): FieldError {
  const text = (value ?? "").trim().toUpperCase();
  if (!text) return required ? "Campo obrigatório." : null;
  if (!/^[A-Z]{2}$/.test(text)) return "Use a sigla de 2 letras (ex.: SC).";
  return (BRAZILIAN_STATES as readonly string[]).includes(text) ? null : "UF inexistente.";
}

export function integerError(
  value: string | number | null | undefined,
  min: number,
  max: number,
  { required = true }: { required?: boolean } = {},
): FieldError {
  if (value === null || value === undefined || String(value).trim() === "") return required ? "Campo obrigatório." : null;
  return isIntegerInRange(value, min, max)
    ? null
    : `Informe um número inteiro entre ${min.toLocaleString("pt-BR")} e ${max.toLocaleString("pt-BR")}.`;
}

export function numberError(
  value: string | number | null | undefined,
  min: number,
  max: number,
  { required = true }: { required?: boolean } = {},
): FieldError {
  if (value === null || value === undefined || String(value).trim() === "") return required ? "Campo obrigatório." : null;
  const number = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) && number >= min && number <= max
    ? null
    : `Informe um valor entre ${min.toLocaleString("pt-BR")} e ${max.toLocaleString("pt-BR")}.`;
}

/** IANA time zone the browser recognises ("America/Sao_Paulo"). */
export function timezoneError(value: string | null | undefined): FieldError {
  const text = (value ?? "").trim();
  if (!text) return "Campo obrigatório.";
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone: text });
    return null;
  } catch {
    return "Fuso horário inválido (ex.: America/Sao_Paulo).";
  }
}

/** "Até" must not be before "De" (dates as yyyy-MM-dd strings). */
export function dateRangeError(from: string | null | undefined, to: string | null | undefined): FieldError {
  if (!from || !to) return null;
  return to < from ? "A data final não pode ser anterior à inicial." : null;
}

/**
 * Remembers which fields the user touched (typed in or left), so errors show
 * while typing or after blur but never on a pristine field.
 */
export function useTouchedFields() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = useCallback((name: string) => {
    setTouched((current) => (current[name] ? current : { ...current, [name]: true }));
  }, []);
  const touchAll = useCallback((names: readonly string[]) => {
    setTouched((current) => ({ ...current, ...Object.fromEntries(names.map((name) => [name, true])) }));
  }, []);
  /** The error to display for a field: only once it was touched. */
  const shown = useCallback(
    (name: string, error: FieldError): FieldError => (touched[name] ? error : null),
    [touched],
  );
  return { touched, touch, touchAll, shown };
}
