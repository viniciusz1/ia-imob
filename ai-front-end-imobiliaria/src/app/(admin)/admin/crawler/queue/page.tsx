import { CrawlerOperationQueueClient } from "@/components/features/crawler/queue/CrawlerOperationQueueClient";
import { getCrawlerOperationQueue } from "@/services/crawlerService";
export default async function CrawlerOperationQueuePage() {
  return (
    <CrawlerOperationQueueClient initialQueue={await getCrawlerOperationQueue()} />
  );
}
