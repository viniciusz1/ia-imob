import { CrawlerQualityDashboard } from "@/components/features/crawler/quality/CrawlerQualityDashboard";
import { listQualitySnapshots } from "@/services/crawlerService";

export default async function CrawlerQualityPage() {
  const runs = await listQualitySnapshots();

  return <CrawlerQualityDashboard runs={runs} />;
}
