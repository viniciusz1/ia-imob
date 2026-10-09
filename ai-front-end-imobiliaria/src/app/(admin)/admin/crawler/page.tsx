import { CrawlerOverviewDashboard } from "@/components/features/crawler/overview/CrawlerOverviewDashboard";
import { getCrawlerOverview, listCrawlerIntegrations, listAuctionSources } from "@/services/crawlerService";

export default async function CrawlerOverviewPage() {
  const [overview, integrations, auctionSources] = await Promise.all([
    getCrawlerOverview(),
    listCrawlerIntegrations(),
    listAuctionSources(),
  ]);

  return <CrawlerOverviewDashboard initialOverview={overview} integrations={integrations} auctionSources={auctionSources} />;
}
