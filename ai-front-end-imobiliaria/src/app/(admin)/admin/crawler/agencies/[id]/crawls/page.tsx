import { History } from "lucide-react";

import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { CrawlHistoryPanel } from "@/components/features/crawler/runs/CrawlHistoryPanel";
import { ExecuteCrawlPanel } from "@/components/features/crawler/runs/ExecuteCrawlPanel";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getCrawlAgency,
  listCrawlerOperations,
  listCrawlRuns,
  listDiscoveryPolicyVersions,
  listDiscoverySnapshots,
  listExtractionProfiles,
  listOnboardingExecutions,
  listQualityPolicies,
} from "@/services/crawlerService";

export default async function CrawlsPage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const [agency, snapshots, profiles, runs, discoveryPolicies, operations, onboardingExecutions, qualityPolicies] = await Promise.all([
    getCrawlAgency(agencyId),
    listDiscoverySnapshots(agencyId),
    listExtractionProfiles(agencyId),
    listCrawlRuns(agencyId),
    listDiscoveryPolicyVersions(),
    listCrawlerOperations({ crawl_agency_id: agencyId, per_page: 100 }),
    listOnboardingExecutions(agencyId),
    listQualityPolicies(),
  ]);
  const activeOnboarding = onboardingExecutions.find((execution) => execution.state !== "completed" && execution.state !== "cancelled") ?? null;
  const pendingCandidate = runs.find((run) => run.publication_state === "candidate") ?? null;
  const hasActiveQualityPolicy = qualityPolicies.some((policy) => policy.status === "active");

  return (
    <div className="space-y-6">
      <CrawlAgencyContextHeader
        agency={agency}
        area="Crawls"
        description="Validações de perfil, execuções de produção e resultados técnicos."
      />

      <Card>
        <CardHeader className="border-b">
          <CardTitle>Executar Crawl</CardTitle>
          <CardDescription>Inicie um crawl de produção ou selecione a opção de validação para perfis candidatos.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExecuteCrawlPanel
            activeOnboarding={activeOnboarding}
            agency={agency}
            discoveryPolicies={discoveryPolicies}
            hasActiveQualityPolicy={hasActiveQualityPolicy}
            initialOperations={operations}
            pendingCandidateRunId={pendingCandidate?.id ?? null}
            profiles={profiles}
            snapshots={snapshots}
          />
        </CardContent>
      </Card>

      <Card className="gap-0 overflow-hidden py-0">
        <SectionHeader icon={History} title="Histórico de crawls" />
        <CrawlHistoryPanel agencyId={agencyId} operations={operations} runs={runs} />
      </Card>
    </div>
  );
}
