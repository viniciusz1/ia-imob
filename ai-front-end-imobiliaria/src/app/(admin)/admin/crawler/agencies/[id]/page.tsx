import { CrawlAgencyWorkspaceClient } from "@/components/features/crawler/agencies/CrawlAgencyWorkspaceClient";
import {
  getCrawlAgency,
  getCrawlAgencySchedule,
  getOnboardingPlan,
  listCrawlerOperations,
  listCrawlRuns,
  listDiscoveryPolicyVersions,
  listDiscoverySnapshots,
  listDiscoveryStrategies,
  listExtractionPolicyVersions,
  listExtractionProfiles,
  listOnboardingExecutionModelVersions,
  listOnboardingExecutions,
} from "@/services/crawlerService";

interface CrawlAgencyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CrawlAgencyDetailPage({ params }: CrawlAgencyDetailPageProps) {
  const { id } = await params;
  const agencyId = Number(id);
  const [
    agency,
    snapshots,
    profiles,
    runs,
    schedule,
    operations,
    onboardingPlan,
    executions,
  ] = await Promise.all([
    getCrawlAgency(agencyId),
    listDiscoverySnapshots(agencyId),
    listExtractionProfiles(agencyId),
    listCrawlRuns(agencyId),
    getCrawlAgencySchedule(agencyId),
    listCrawlerOperations({ crawl_agency_id: agencyId }),
    getOnboardingPlan(agencyId).catch(() => null),
    listOnboardingExecutions(agencyId),
  ]);

  const needsPlanCatalogs =
    onboardingPlan?.status === "draft" && executions[0]?.state !== "completed";

  const [
    discoveryStrategies,
    discoveryPolicies,
    extractionPolicies,
    models,
  ] = needsPlanCatalogs
    ? await Promise.all([
        listDiscoveryStrategies(),
        listDiscoveryPolicyVersions(),
        listExtractionPolicyVersions(),
        listOnboardingExecutionModelVersions(),
      ])
    : [[], [], [], []];

  return (
    <CrawlAgencyWorkspaceClient
      agency={agency}
      discoveryPolicies={discoveryPolicies}
      discoveryStrategies={discoveryStrategies}
      executions={executions}
      extractionPolicies={extractionPolicies}
      initialOperations={operations}
      models={models}
      onboardingPlan={onboardingPlan}
      profiles={profiles}
      runs={runs}
      schedule={schedule}
      snapshots={snapshots}
    />
  );
}
