import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { CrawlAgencySettingsForm } from "@/components/features/crawler/agencies/CrawlAgencySettingsForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency } from "@/services/crawlerService";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const agency = await getCrawlAgency(agencyId);
  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Configuração" description="Identidade e estado administrativo da fonte." /><Card><CardHeader><CardTitle>Identidade da Crawl Agency</CardTitle></CardHeader><CardContent><CrawlAgencySettingsForm agency={agency} /></CardContent></Card></section>;
}
