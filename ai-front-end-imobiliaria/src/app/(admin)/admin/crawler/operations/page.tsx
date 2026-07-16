import { CrawlerOperationsClient } from "@/components/features/crawler/operations/CrawlerOperationsClient";
import {
  listCrawlAgencies,
  listCrawlerOperations,
  listCrawlerWorkers,
  listMarketDataContracts,
} from "@/services/crawlerService";

export default async function CrawlerOperationsPage() {
  const [agencies, contracts, operations, workers] = await Promise.all([
    listCrawlAgencies(),
    listMarketDataContracts(),
    listCrawlerOperations(),
    listCrawlerWorkers(),
  ]);

  return <CrawlerOperationsClient agencies={agencies} contracts={contracts} initialOperations={operations} initialWorkers={workers} />;
}
