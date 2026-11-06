import axios from "axios";

interface MarketSearchErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  allowance?: {
    resets_at?: string;
  };
}

export function getMarketSearchErrorMessage(error: unknown): string {
  if (!axios.isAxiosError<MarketSearchErrorPayload>(error)) {
    return "Erro ao processar a busca. Tente novamente.";
  }

  const payload = error.response?.data;
  if (error.response?.status === 429 && payload?.code === "user_market_search_daily_limit_exhausted") {
    const reset = payload.allowance?.resets_at;
    return reset ? `Limite diário de buscas atingido. Disponível novamente em ${new Date(reset).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "Limite diário de buscas atingido.";
  }
  if (error.response?.status === 429 && payload?.code === "market_search_allowance_exhausted") {
    const reset = payload.allowance?.resets_at;
    return reset ? `Limite semanal de buscas da imobiliária atingido. Disponível novamente em ${new Date(reset).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.` : "Limite semanal de buscas da imobiliária atingido.";
  }

  return payload?.error || payload?.message || "Erro ao processar a busca. Tente novamente.";
}

export function isMarketSearchAllowanceExceeded(error: unknown): boolean {
  return axios.isAxiosError<MarketSearchErrorPayload>(error)
    && error.response?.status === 429
    && ["market_search_allowance_exhausted", "user_market_search_daily_limit_exhausted"].includes(error.response.data?.code ?? "");
}
