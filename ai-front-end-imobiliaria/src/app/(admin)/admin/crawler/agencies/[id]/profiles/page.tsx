import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { ExtractionProfilesWorkspace } from "@/components/features/crawler/profiles/ExtractionProfilesWorkspace";
import { getCrawlAgency, listDiscoverySnapshots, listExtractionProfiles, listMarketDataContracts, listProfileWorkflowOperations } from "@/services/crawlerService";

export default async function ProfilesPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ variant?: string }> }) {
  const agencyId = Number((await params).id);
  const requestedVariant = (await searchParams).variant;
  const prototypeVariant = process.env.NODE_ENV !== "production" && (requestedVariant === "A" || requestedVariant === "B" || requestedVariant === "C") ? requestedVariant : undefined;
  const [agency, snapshots, contracts, profiles, operations] = await Promise.all([
    getCrawlAgency(agencyId),
    listDiscoverySnapshots(agencyId),
    listMarketDataContracts(),
    listExtractionProfiles(agencyId),
    listProfileWorkflowOperations(agencyId),
  ]);

  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Perfis de Extração" description="Configurações versionadas, validações e decisões humanas." /><ExtractionProfilesWorkspace agency={agency} contracts={contracts} initialOperations={operations} initialProfiles={profiles} prototypeVariant={prototypeVariant} snapshots={snapshots} /></section>;
}
