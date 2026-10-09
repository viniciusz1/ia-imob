import { CrawlerOverviewDashboard } from "@/components/features/crawler/overview/CrawlerOverviewDashboard";
import { getCrawlerOverview, listCrawlerIntegrations, listCrawlerWorkers } from "@/services/crawlerService";

export default async function CrawlerOverviewPage() {
  const [overview, integrations, workers] = await Promise.all([
    getCrawlerOverview(),
    listCrawlerIntegrations(),
    listCrawlerWorkers(),
  ]);

  return <CrawlerOverviewDashboard initialOverview={overview} integrations={integrations} workers={workers} />;
}
