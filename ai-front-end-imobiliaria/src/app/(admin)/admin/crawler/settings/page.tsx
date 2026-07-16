import { MarketDataContractsClient } from "@/components/features/crawler/settings/MarketDataContractsClient";
import { listMarketDataContracts } from "@/services/crawlerService";
import { QualityPoliciesClient } from "@/components/features/crawler/settings/QualityPoliciesClient";
import { listQualityPolicies } from "@/services/crawlerService";

export default async function CrawlerSettingsPage() {
  const [contracts, policies] = await Promise.all([listMarketDataContracts(), listQualityPolicies()]);
  return <div className="space-y-8"><MarketDataContractsClient initialContracts={contracts} /><QualityPoliciesClient initialPolicies={policies} /></div>;
}
