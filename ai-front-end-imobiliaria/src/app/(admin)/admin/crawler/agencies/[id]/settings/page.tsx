import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { CrawlAgencyLifecycleSettings } from "@/components/features/crawler/agencies/CrawlAgencyLifecycleSettings";
import { CrawlAgencySettingsForm } from "@/components/features/crawler/agencies/CrawlAgencySettingsForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency } from "@/services/crawlerService";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const agency = await getCrawlAgency(agencyId);

  return (
    <div className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area="Configuração"
        description="Identidade e estado administrativo da fonte."
      />
      <CrawlAgencySettingsForm agency={agency} />
      <Card>
        <CardHeader>
          <CardTitle>Estado administrativo e ciclo de vida</CardTitle>
          <CardDescription>Ative, pause ou arquive a fonte de acordo com a operação.</CardDescription>
        </CardHeader>
        <CardContent>
          <CrawlAgencyLifecycleSettings agency={agency} />
        </CardContent>
      </Card>
    </div>
  );
}
