import { notFound } from "next/navigation";
import { isAxiosError } from "axios";
import { ProductionBatchDetail } from "@/components/features/crawler/batches/ProductionBatchDetail";
import {
  getBatchDiagnostics,
  getProductionBatch,
  listProductionBatchItems,
} from "@/services/productionBatchService";
export default async function ProductionBatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) < 1)
    notFound();
  const [batch, items, diagnostics] = await Promise.all([
    getProductionBatch(Number(id)),
    listProductionBatchItems(Number(id)),
    getBatchDiagnostics(Number(id)),
  ]).catch((error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 404) notFound();
    throw error;
  });
  return (
    <ProductionBatchDetail
      key={batch.id}
      initialBatch={batch}
      initialItems={items}
      initialDiagnostics={diagnostics}
    />
  );
}
