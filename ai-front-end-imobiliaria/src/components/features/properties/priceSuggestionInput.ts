import type { PropertyFormValues } from "@/schemas/propertySchema";
import type { ResidentialType, ValuationInput, ValuationPurpose } from "@/types/valuation";

type SuggestionFields = Pick<PropertyFormValues,
  "property_type" | "purpose" | "city" | "neighborhood" | "usable_area" |
  "bedrooms" | "bathrooms" | "garage_spaces"
>;

const residentialTypes: Record<string, ResidentialType | undefined> = {
  casa: "house", apartamento: "apartment", sobrado: "townhouse",
};
const purposes: Record<string, ValuationPurpose[] | undefined> = {
  venda: ["sale"], locacao: ["rent"], venda_locacao: ["sale", "rent"],
};

export function priceSuggestionInput(
  fields: Partial<SuggestionFields>, floodRisk: boolean,
): { inputs: ValuationInput[]; issues: string[] } {
  const issues: string[] = [];
  const residentialType = residentialTypes[fields.property_type ?? ""];
  const selectedPurposes = purposes[fields.purpose ?? ""];
  const area = fields.usable_area;
  const city = fields.city?.trim() ?? "";
  const neighborhood = fields.neighborhood?.trim() ?? "";
  if (!residentialType) issues.push("Selecione casa, apartamento ou sobrado em Dados Básicos.");
  if (!selectedPurposes) issues.push("Selecione venda, locação ou ambas em Dados Básicos.");
  if (!city || !neighborhood || city.length > 120 || neighborhood.length > 120) {
    issues.push("Preencha cidade e bairro em Localização (até 120 caracteres cada).");
  }
  if (typeof area !== "number" || !Number.isFinite(area) || area < 20 || area > 2000) {
    issues.push("Preencha a área útil entre 20 e 2.000 m² em Características.");
  }
  const counts = [fields.bedrooms, fields.bathrooms, fields.garage_spaces];
  if (counts.some((value) => typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 10)) {
    issues.push("Preencha quartos, banheiros e vagas com números inteiros entre 0 e 10.");
  }
  if (issues.length || !residentialType || !selectedPurposes || area == null) return { inputs: [], issues };
  return {
    issues: [],
    inputs: selectedPurposes.map((purpose) => ({
      purpose, city: [city], neighborhood: [neighborhood], residential_type: residentialType,
      area, bedrooms: fields.bedrooms!, bathrooms: fields.bathrooms!,
      garage_spaces: fields.garage_spaces!, flood_risk: floodRisk,
    })),
  };
}
