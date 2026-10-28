import api, { API_PREFIX } from "./api";
import type {
  BatchDiagnosticFilters,
  BatchDiagnosticsPage,
  BatchFilters,
  BatchItemFilters,
  BatchPage,
  ProductionBatch,
  ProductionBatchItem,
} from "@/types/productionBatch";
const base = `${API_PREFIX}/admin/crawler/production-crawl-batches`;
export async function listProductionBatches(
  filters: BatchFilters = {},
): Promise<BatchPage<ProductionBatch>> {
  return (await api.get<BatchPage<ProductionBatch>>(base, { params: filters }))
    .data;
}
export async function getProductionBatch(id: number): Promise<ProductionBatch> {
  return (await api.get<{ data: ProductionBatch }>(`${base}/${id}`)).data.data;
}
export async function listProductionBatchItems(
  id: number,
  filters: BatchItemFilters = {},
): Promise<BatchPage<ProductionBatchItem>> {
  return (
    await api.get<BatchPage<ProductionBatchItem>>(`${base}/${id}/items`, {
      params: filters,
    })
  ).data;
}
export async function getBatchDiagnostics(
  id: number,
  filters: BatchDiagnosticFilters = {},
): Promise<BatchDiagnosticsPage> {
  return (
    await api.get<BatchDiagnosticsPage>(`${base}/${id}/diagnostics`, {
      params: filters,
    })
  ).data;
}
export async function rerunProductionBatch(
  id: number,
  input: { confirmed: true; request_key: string; item_ids?: number[] },
): Promise<{ batch: ProductionBatch }> {
  return (
    await api.post<{ data: { batch: ProductionBatch } }>(
      `${base}/${id}/rerun`,
      input,
    )
  ).data.data;
}
