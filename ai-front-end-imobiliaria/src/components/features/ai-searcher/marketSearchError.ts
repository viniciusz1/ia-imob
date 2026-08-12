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
  if (error.response?.status === 429 && payload?.code === "market_search_allowance_exhausted") {
    return "Limite excedido. Entre em contato com a equipe técnica.";
  }

  return payload?.error || payload?.message || "Erro ao processar a busca. Tente novamente.";
}

export function isMarketSearchAllowanceExceeded(error: unknown): boolean {
  return axios.isAxiosError<MarketSearchErrorPayload>(error)
    && error.response?.status === 429
    && error.response.data?.code === "market_search_allowance_exhausted";
}
