import { CrawlerOperationsClient } from "@/components/features/crawler/operations/CrawlerOperationsClient";
import {
  listCrawlAgencies,
  listCrawlerOperations,
  listCrawlerWorkers,
} from "@/services/crawlerService";
import type { CrawlerOperationFilters, CrawlerOperationState } from "@/types/crawler";

interface CrawlerOperationsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function CrawlerOperationsPage({ searchParams }: CrawlerOperationsPageProps) {
  const query = await searchParams;
  const filters: CrawlerOperationFilters = {
    ...(first(query.type) && { type: first(query.type) }),
    ...(first(query.state) && { state: first(query.state) as CrawlerOperationState }),
    ...(first(query.crawl_agency_id) && { crawl_agency_id: Number(first(query.crawl_agency_id)) }),
    ...(first(query.group_id) && { group_id: Number(first(query.group_id)) }),
    ...(first(query.requested_by) && { requested_by: Number(first(query.requested_by)) }),
    ...(first(query.from) && { from: first(query.from) }),
    ...(first(query.to) && { to: first(query.to) }),
  };
  const [agencies, operations, workers] = await Promise.all([
    listCrawlAgencies(),
    listCrawlerOperations(filters),
    listCrawlerWorkers(),
  ]);

  return <CrawlerOperationsClient agencies={agencies} initialFilters={filters} initialOperations={operations} initialWorkers={workers} />;
}
