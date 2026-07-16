import { CrawlerOverviewDashboard } from "@/components/features/crawler/overview/CrawlerOverviewDashboard";
import { getCrawlerOverview, listCrawlerIntegrations } from "@/services/crawlerService";

export default async function CrawlerOverviewPage() {
  const [overview, integrations] = await Promise.all([
    getCrawlerOverview(),
    listCrawlerIntegrations(),
  ]);

  return <CrawlerOverviewDashboard initialOverview={overview} integrations={integrations} />;
}
