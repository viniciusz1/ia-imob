import { CrawlAgencyOnboardingClient } from "@/components/features/crawler/agencies/CrawlAgencyOnboardingClient";
import {
  getCrawlAgency,
  getOnboardingPlan,
  listDiscoveryPolicyVersions,
  listDiscoverySnapshots,
  listDiscoveryStrategies,
  listExtractionPolicyVersions,
  listOnboardingExecutionModelVersions,
  listOnboardingExecutions,
} from "@/services/crawlerService";

interface CrawlAgencyOnboardingPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ novo?: string; new?: string }>;
}

export default async function CrawlAgencyOnboardingPage({
  params,
  searchParams,
}: CrawlAgencyOnboardingPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialOpenModal =
    resolvedSearchParams.novo === "true" || resolvedSearchParams.new === "true";
  const agencyId = Number(id);
  const [
    agency,
    executions,
    onboardingPlan,
    snapshots,
    discoveryStrategies,
    discoveryPolicies,
    extractionPolicies,
    models,
  ] = await Promise.all([
    getCrawlAgency(agencyId),
    listOnboardingExecutions(agencyId),
    getOnboardingPlan(agencyId).catch(() => null),
    listDiscoverySnapshots(agencyId).catch(() => []),
    listDiscoveryStrategies().catch(() => []),
    listDiscoveryPolicyVersions().catch(() => []),
    listExtractionPolicyVersions().catch(() => []),
    listOnboardingExecutionModelVersions().catch(() => []),
  ]);

  return (
    <CrawlAgencyOnboardingClient
      agency={agency}
      discoveryPolicies={discoveryPolicies}
      discoveryStrategies={discoveryStrategies}
      extractionPolicies={extractionPolicies}
      initialExecutions={executions}
      initialOpenModal={initialOpenModal}
      models={models}
      plan={onboardingPlan}
      snapshots={snapshots}
    />
  );
}
