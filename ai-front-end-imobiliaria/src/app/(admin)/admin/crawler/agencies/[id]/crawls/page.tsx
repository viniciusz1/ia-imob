import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { CrawlRunSnapshotsPanel } from "@/components/features/crawler/runs/CrawlRunSnapshotsPanel";
import { ProductionCrawlPanel } from "@/components/features/crawler/runs/ProductionCrawlPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency, listCrawlRuns, listDiscoverySnapshots, listExtractionProfiles } from "@/services/crawlerService";

export default async function CrawlsPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const [agency, snapshots, profiles, runs] = await Promise.all([getCrawlAgency(agencyId), listDiscoverySnapshots(agencyId), listExtractionProfiles(agencyId), listCrawlRuns(agencyId)]);

  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Crawls e qualidade" description="Execuções de produção, qualidade e publicação dos dados." /><Card><CardHeader><CardTitle>Executar crawl manual</CardTitle></CardHeader><CardContent><ProductionCrawlPanel agencyId={agencyId} profiles={profiles} snapshots={snapshots} /></CardContent></Card><Card><CardHeader><CardTitle>Runs e qualidade</CardTitle></CardHeader><CardContent><CrawlRunSnapshotsPanel runs={runs} /></CardContent></Card></section>;
}
