import api, { API_PREFIX } from "./api";
import type {
  ComparableCandidate,
  CreateValuationInput,
  PaginatedValuationsResponse,
  Valuation,
  ValuationInput,
} from "@/types/valuation";

const BASE_PATH = `${API_PREFIX}/valuations`;

export async function createValuation(input: CreateValuationInput): Promise<Valuation> {
  const { data } = await api.post<{ data: Valuation }>(BASE_PATH, input);
  return data.data;
}

export async function getValuationCandidates(input: ValuationInput): Promise<ComparableCandidate[]> {
  const { data } = await api.post<{ data: ComparableCandidate[] }>(`${BASE_PATH}/candidates`, input);
  return data.data;
}

export async function getValuations(page = 1): Promise<PaginatedValuationsResponse> {
  const { data } = await api.get<PaginatedValuationsResponse>(BASE_PATH, {
    params: { page },
  });
  return data;
}

export async function getValuation(id: number): Promise<Valuation> {
  const { data } = await api.get<{ data: Valuation }>(`${BASE_PATH}/${id}`);
  return data.data;
}

async function downloadValuationFile(path: string, filename: string): Promise<void> {
  const response = await api.get<Blob>(path, {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadValuationReport(valuation: Valuation): Promise<void> {
  await downloadValuationFile(`${BASE_PATH}/${valuation.id}/report.pdf`, `${valuation.code}.pdf`);
}

export async function downloadValuationWordReport(valuation: Valuation): Promise<void> {
  await downloadValuationFile(`${BASE_PATH}/${valuation.id}/report.docx`, `${valuation.code}.docx`);
}

export async function downloadValuationComparables(valuation: Valuation): Promise<void> {
  await downloadValuationFile(`${BASE_PATH}/${valuation.id}/comparables.xlsx`, `${valuation.code}-comparaveis.xlsx`);
}
