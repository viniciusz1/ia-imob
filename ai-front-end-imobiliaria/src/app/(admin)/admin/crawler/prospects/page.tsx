import { ProspectsClient } from "@/components/features/crawler/prospects/ProspectsClient";
import { listCrawlAgencySuggestions, listProspects } from "@/services/crawlerService";

export const dynamic = "force-dynamic";

export default async function ProspectsPage() {
  const [prospects, suggestions] = await Promise.all([listProspects(), listCrawlAgencySuggestions()]);
  return <ProspectsClient initialProspects={prospects} initialSuggestions={suggestions} />;
}
