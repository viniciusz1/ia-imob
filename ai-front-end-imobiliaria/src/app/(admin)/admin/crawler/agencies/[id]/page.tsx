import { CrawlAgencyWorkspaceClient } from "@/components/features/crawler/agencies/CrawlAgencyWorkspaceClient";
import {
  getCrawlAgency,
  getCrawlAgencySchedule,
  listCrawlerOperations,
  listCrawlRuns,
  listDiscoverySnapshots,
  listExtractionProfiles,
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
    executions,
  ] = await Promise.all([
    getCrawlAgency(agencyId),
    listDiscoverySnapshots(agencyId),
    listExtractionProfiles(agencyId),
    listCrawlRuns(agencyId),
    getCrawlAgencySchedule(agencyId),
    listCrawlerOperations({ crawl_agency_id: agencyId }),
    listOnboardingExecutions(agencyId),
  ]);

  return (
    <CrawlAgencyWorkspaceClient
      agency={agency}
      executions={executions}
      initialOperations={operations}
      profiles={profiles}
      runs={runs}
      schedule={schedule}
      snapshots={snapshots}
    />
  );
}
