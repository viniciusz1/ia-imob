import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrawlAgencyForm } from "@/components/features/crawler/agencies/CrawlAgencyForm";

export default function NewCrawlAgencyPage() {
  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader><CardTitle>Nova Crawl Agency</CardTitle></CardHeader>
      <CardContent><CrawlAgencyForm /></CardContent>
    </Card>
  );
}
