import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { DiscoveryGenerator } from "@/components/features/crawler/discoveries/DiscoveryGenerator";
import { DiscoverySnapshotsPanel } from "@/components/features/crawler/discoveries/DiscoverySnapshotsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCrawlAgency,
  getOnboardingExecution,
  listDiscoverySnapshots,
  listMarketDataContracts,
  listOnboardingDiscoverySnapshotCandidates,
} from "@/services/crawlerService";

interface DiscoveriesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onboarding_execution_id?: string }>;
}

export default async function DiscoveriesPage({ params, searchParams }: DiscoveriesPageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const agencyId = Number(id);
  const onboardingExecutionId = Number(query.onboarding_execution_id);
  const [agency, snapshots, contracts] = await Promise.all([
    getCrawlAgency(agencyId),
    listDiscoverySnapshots(agencyId),
    listMarketDataContracts(),
  ]);
  const [execution, candidates] = Number.isInteger(onboardingExecutionId) && onboardingExecutionId > 0
    ? await Promise.all([
        getOnboardingExecution(onboardingExecutionId),
        listOnboardingDiscoverySnapshotCandidates(onboardingExecutionId),
      ])
    : [null, []];
  const onboardingRecovery = execution?.crawl_agency_id === agencyId
    && execution.state === "requires_attention"
    && execution.current_step === "discovery"
    ? { candidates, executionId: execution.id }
    : undefined;

  return (
    <section className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area="Discoveries"
        description="Snapshots imutáveis de URLs desta Crawl Agency."
      />
      <Card>
        <CardHeader><CardTitle>Novo Discovery</CardTitle></CardHeader>
        <CardContent><DiscoveryGenerator agencyId={agencyId} contracts={contracts} /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Snapshots de Discovery</CardTitle></CardHeader>
        <CardContent>
          <DiscoverySnapshotsPanel onboardingRecovery={onboardingRecovery} snapshots={snapshots} />
        </CardContent>
      </Card>
    </section>
  );
}
