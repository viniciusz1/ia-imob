import { MarketDataContractsClient } from "@/components/features/crawler/settings/MarketDataContractsClient";
import { OnboardingCatalogsClient } from "@/components/features/crawler/settings/OnboardingCatalogsClient";
import { QualityPoliciesClient } from "@/components/features/crawler/settings/QualityPoliciesClient";
import { ScheduleDefaultPanel } from "@/components/features/crawler/schedules/ScheduleDefaultPanel";
import {
  getScheduleDefault,
  listDiscoveryPolicyVersions,
  listDiscoveryStrategies,
  listExtractionPolicyVersions,
  listMarketDataContracts,
  listOnboardingExecutionModelVersions,
  listQualityPolicies,
} from "@/services/crawlerService";

export default async function CrawlerSettingsPage() {
  const [
    contracts,
    qualityPolicies,
    scheduleDefault,
    discoveryStrategies,
    discoveryPolicies,
    extractionPolicies,
    onboardingModels,
  ] = await Promise.all([
    listMarketDataContracts(),
    listQualityPolicies(),
    getScheduleDefault(),
    listDiscoveryStrategies(),
    listDiscoveryPolicyVersions(),
    listExtractionPolicyVersions(),
    listOnboardingExecutionModelVersions(),
  ]);

  return (
    <div className="space-y-8">
      <OnboardingCatalogsClient
        initialDiscoveryPolicies={discoveryPolicies}
        initialDiscoveryStrategies={discoveryStrategies}
        initialExtractionPolicies={extractionPolicies}
        initialModels={onboardingModels}
      />
      <ScheduleDefaultPanel initialDefault={scheduleDefault} />
      <MarketDataContractsClient initialContracts={contracts} />
      <QualityPoliciesClient initialPolicies={qualityPolicies} />
    </div>
  );
}
