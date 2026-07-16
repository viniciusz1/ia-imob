import { MarketDataContractsClient } from "@/components/features/crawler/settings/MarketDataContractsClient";
import { listMarketDataContracts } from "@/services/crawlerService";
import { QualityPoliciesClient } from "@/components/features/crawler/settings/QualityPoliciesClient";
import { listQualityPolicies } from "@/services/crawlerService";
import { ScheduleDefaultPanel } from "@/components/features/crawler/schedules/ScheduleDefaultPanel";
import { getScheduleDefault } from "@/services/crawlerService";

export default async function CrawlerSettingsPage() {
  const [contracts, policies, scheduleDefault] = await Promise.all([listMarketDataContracts(), listQualityPolicies(), getScheduleDefault()]);
  return <div className="space-y-8"><ScheduleDefaultPanel initialDefault={scheduleDefault} /><MarketDataContractsClient initialContracts={contracts} /><QualityPoliciesClient initialPolicies={policies} /></div>;
}
