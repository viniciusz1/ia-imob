import type { ValuationPurpose } from "@/types/valuation";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatValuationMoney(value: number, purpose: ValuationPurpose = "sale"): string {
  return currencyFormatter.format(value) + (purpose === "rent" ? "/mês" : "");
}

export function valuationPresentation(purpose: ValuationPurpose) {
  const transaction = purpose === "rent" ? "locação" : "venda";
  return {
    title: `Avaliação de ${transaction}`,
    estimatedValue: `Valor estimado de ${transaction}`,
    price: purpose === "rent" ? "Aluguel mensal" : "Valor de venda",
    pricePerArea: purpose === "rent" ? "Aluguel/m²" : "Valor de venda/m²",
    description: purpose === "rent"
      ? "Estime o aluguel mensal com base em imóveis comparáveis para locação."
      : "Estime o valor de venda com base em imóveis comparáveis à venda.",
    hint: purpose === "rent"
      ? "Estimativa do aluguel mensal, sem condomínio, IPTU ou outras taxas."
      : "Estimativa do valor de venda do imóvel com base no mercado.",
  };
}
