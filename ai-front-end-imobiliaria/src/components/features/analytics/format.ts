const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

const percent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const EMPTY_VALUE = "—";

export function formatCurrency(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY_VALUE : currency.format(value);
}

export function formatSquareMetrePrice(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY_VALUE : `${currency.format(value)}/m²`;
}

export function formatCount(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY_VALUE : decimal.format(value);
}

export function formatShare(value: number | null | undefined): string {
  return value === null || value === undefined ? EMPTY_VALUE : percent.format(value);
}

export function formatReferenceDate(value: string | null): string {
  if (value === null) return EMPTY_VALUE;

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export const FIELD_LABELS: Record<string, string> = {
  price: "Valor",
  area: "Área",
  type: "Tipo",
  city: "Cidade",
  neighbourhood: "Bairro",
  bedrooms: "Quartos",
  suites: "Suítes",
  bathrooms: "Banheiros",
  parking_spaces: "Vagas",
  construction_year: "Ano de construção",
  listing_url: "Link do anúncio",
};
