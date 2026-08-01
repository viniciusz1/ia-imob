import { CrawlAgencyOnboardingClient } from "@/components/features/crawler/agencies/CrawlAgencyOnboardingClient";
import { getCrawlAgency, listOnboardingExecutions } from "@/services/crawlerService";

interface CrawlAgencyOnboardingPageProps {
  params: Promise<{ id: string }>;
}

export default async function CrawlAgencyOnboardingPage({ params }: CrawlAgencyOnboardingPageProps) {
  const { id } = await params;
  const agencyId = Number(id);
  const [agency, executions] = await Promise.all([
    getCrawlAgency(agencyId),
    listOnboardingExecutions(agencyId),
  ]);

  return <CrawlAgencyOnboardingClient agency={agency} initialExecutions={executions} />;
}
