import { ProductionBatchesClient } from "@/components/features/crawler/batches/ProductionBatchesClient";
import { listProductionBatches } from "@/services/productionBatchService";
export default async function ProductionBatchesPage() {
  return (
    <ProductionBatchesClient initialPage={await listProductionBatches()} />
  );
}
