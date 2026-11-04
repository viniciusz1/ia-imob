const grouping = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export function toDigits(value: string): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

export function formatCurrencyInput(value: string): string {
  const digits = toDigits(value);

  return digits === "" ? "" : `R$ ${grouping.format(Number(digits))}`;
}

export function formatAreaInput(value: string): string {
  const digits = toDigits(value);

  return digits === "" ? "" : `${grouping.format(Number(digits))} m²`;
}
