import Link from "next/link";

import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { DiscoveryGenerator } from "@/components/features/crawler/discoveries/DiscoveryGenerator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency, listDiscoverySnapshots, listMarketDataContracts } from "@/services/crawlerService";

export default async function DiscoveriesPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const [agency, snapshots, contracts] = await Promise.all([getCrawlAgency(agencyId), listDiscoverySnapshots(agencyId), listMarketDataContracts()]);

  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Discoveries" description="Snapshots imutáveis de URLs desta Crawl Agency." /><Card><CardHeader><CardTitle>Novo Discovery</CardTitle></CardHeader><CardContent><DiscoveryGenerator agencyId={agencyId} contracts={contracts} /></CardContent></Card><Card><CardHeader><CardTitle>Snapshots de Discovery</CardTitle></CardHeader><CardContent className="space-y-3">{snapshots.length === 0 ? <p className="text-muted-foreground">Nenhum Discovery criado.</p> : snapshots.map((snapshot) => <Link className="block cursor-pointer rounded-md border p-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`/admin/crawler/discoveries/${snapshot.id}`} key={snapshot.id}><strong>Snapshot #{snapshot.id}</strong><span className="ml-2 text-sm text-muted-foreground">{snapshot.url_count} URLs · {new Date(snapshot.created_at).toLocaleString("pt-BR")}</span></Link>)}</CardContent></Card></section>;
}
