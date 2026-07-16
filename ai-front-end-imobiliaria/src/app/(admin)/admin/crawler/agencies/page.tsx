import { CrawlAgenciesClient } from "@/components/features/crawler/agencies/CrawlAgenciesClient";
import { listCrawlAgencies } from "@/services/crawlerService";

export default async function CrawlAgenciesPage() {
  const agencies = await listCrawlAgencies();
  return <CrawlAgenciesClient initialAgencies={agencies} />;
}
