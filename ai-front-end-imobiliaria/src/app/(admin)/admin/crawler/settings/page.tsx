import { MarketDataContractsClient } from "@/components/features/crawler/settings/MarketDataContractsClient";
import { listMarketDataContracts } from "@/services/crawlerService";

export default async function CrawlerSettingsPage() {
  const contracts = await listMarketDataContracts();
  return <MarketDataContractsClient initialContracts={contracts} />;
}
