import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { CrawlAgencyQualityPanel } from "@/components/features/crawler/quality/CrawlAgencyQualityPanel";
import { getCrawlAgency, listCrawlRuns } from "@/services/crawlerService";

export default async function CrawlAgencyQualityPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const [agency, runs] = await Promise.all([getCrawlAgency(agencyId), listCrawlRuns(agencyId)]);

  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Qualidade" description="Portão de Qualidade, publicação, quarentena e decisões desta Crawl Agency." /><CrawlAgencyQualityPanel currentPublishedRunId={agency.current_published_crawl_run_id} runs={runs} /></section>;
}
