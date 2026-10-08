import { Layers } from "lucide-react";

import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { DiscoveryGenerator } from "@/components/features/crawler/discoveries/DiscoveryGenerator";
import { DiscoverySnapshotsPanel } from "@/components/features/crawler/discoveries/DiscoverySnapshotsPanel";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area="Discoveries"
        description="Snapshots imutáveis de URLs desta Crawl Agency."
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Novo Discovery</CardTitle>
          <CardDescription>Escolha as fontes e o contrato de dados para gerar um novo Snapshot de URLs.</CardDescription>
        </CardHeader>
        <CardContent>
          <DiscoveryGenerator agencyId={agencyId} contracts={contracts} />
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader
          as="h3"
          description="Abra um Snapshot para conferir as URLs encontradas."
          icon={Layers}
          title="Snapshots de Discovery"
        />
        <DiscoverySnapshotsPanel onboardingRecovery={onboardingRecovery} snapshots={snapshots} />
      </Card>
    </div>
  );
}
