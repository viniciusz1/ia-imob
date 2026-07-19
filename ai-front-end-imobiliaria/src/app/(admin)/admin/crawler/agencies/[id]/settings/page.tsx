import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency } from "@/services/crawlerService";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const agency = await getCrawlAgency(agencyId);
  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Configuração" description="Identidade e estado administrativo da fonte." /><Card><CardHeader><CardTitle>Identidade da Crawl Agency</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><div><p className="text-sm text-muted-foreground">Domínio</p><p>{agency.root_domain}</p></div><div><p className="text-sm text-muted-foreground">URL base</p><p className="break-all">{agency.base_url}</p></div><div><p className="text-sm text-muted-foreground">Slug</p><p>{agency.slug}</p></div><div><p className="text-sm text-muted-foreground">Estado administrativo</p><p>{agency.lifecycle_state}</p></div></CardContent></Card></section>;
}
