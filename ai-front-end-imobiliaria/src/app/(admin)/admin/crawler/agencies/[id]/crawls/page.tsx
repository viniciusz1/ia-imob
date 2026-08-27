import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { CrawlHistoryPanel } from "@/components/features/crawler/runs/CrawlHistoryPanel";
import { ProductionCrawlPanel } from "@/components/features/crawler/runs/ProductionCrawlPanel";
import { ValidationCrawlPanel } from "@/components/features/crawler/runs/ValidationCrawlPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency, listCrawlerOperations, listCrawlRuns, listDiscoveryPolicyVersions, listDiscoverySnapshots, listExtractionProfiles, listOnboardingExecutions, listQualityPolicies } from "@/services/crawlerService";

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

  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Crawls" description="Validações de perfil, execuções de produção e resultados técnicos." /><Card><CardHeader><CardTitle>Validar Perfil de Extração</CardTitle></CardHeader><CardContent><ValidationCrawlPanel activeOnboarding={activeOnboarding} agencyId={agencyId} initialOperations={operations} profiles={profiles} /></CardContent></Card><Card><CardHeader><CardTitle>Executar Crawl de Produção</CardTitle></CardHeader><CardContent><ProductionCrawlPanel agency={agency} discoveryPolicies={discoveryPolicies} hasActiveQualityPolicy={hasActiveQualityPolicy} pendingCandidateRunId={pendingCandidate?.id ?? null} profiles={profiles} snapshots={snapshots} /></CardContent></Card><Card><CardHeader><CardTitle>Histórico de crawls</CardTitle></CardHeader><CardContent><CrawlHistoryPanel agencyId={agencyId} operations={operations} runs={runs} /></CardContent></Card></section>;
}
