import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { DiscoveryGenerator } from "@/components/features/crawler/discoveries/DiscoveryGenerator";
import { DiscoverySnapshotsPanel } from "@/components/features/crawler/discoveries/DiscoverySnapshotsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency, listDiscoverySnapshots, listMarketDataContracts } from "@/services/crawlerService";

export default async function DiscoveriesPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const [agency, snapshots, contracts] = await Promise.all([getCrawlAgency(agencyId), listDiscoverySnapshots(agencyId), listMarketDataContracts()]);

  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Discoveries" description="Snapshots imutáveis de URLs desta Crawl Agency." /><Card><CardHeader><CardTitle>Novo Discovery</CardTitle></CardHeader><CardContent><DiscoveryGenerator agencyId={agencyId} contracts={contracts} /></CardContent></Card><Card><CardHeader><CardTitle>Snapshots de Discovery</CardTitle></CardHeader><CardContent><DiscoverySnapshotsPanel snapshots={snapshots} /></CardContent></Card></section>;
}
