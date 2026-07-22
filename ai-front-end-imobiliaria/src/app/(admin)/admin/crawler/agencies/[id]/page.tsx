import { CrawlAgencyWorkspaceClient } from "@/components/features/crawler/agencies/CrawlAgencyWorkspaceClient";
import { getCrawlAgency, getCrawlAgencySchedule } from "@/services/crawlerService";
import { listCrawlRuns, listCrawlerOperations, listExtractionProfiles } from "@/services/crawlerService";

interface CrawlAgencyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CrawlAgencyDetailPage({ params }: CrawlAgencyDetailPageProps) {
  const { id } = await params;
  const agencyId = Number(id);
  const [agency, profiles, runs, schedule, operations] = await Promise.all([
    getCrawlAgency(agencyId),
    listExtractionProfiles(agencyId),
    listCrawlRuns(agencyId),
    getCrawlAgencySchedule(agencyId),
    listCrawlerOperations({ crawl_agency_id: agencyId }),
  ]);

  return <CrawlAgencyWorkspaceClient agency={agency} initialOperations={operations} profiles={profiles} runs={runs} schedule={schedule} />;
}
