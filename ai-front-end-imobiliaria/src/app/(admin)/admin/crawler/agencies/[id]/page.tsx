import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCrawlAgency } from "@/services/crawlerService";
import { listDiscoverySnapshots, listExtractionProfiles, listMarketDataContracts } from "@/services/crawlerService";
import { ExtractionProfileGenerator } from "@/components/features/crawler/profiles/ExtractionProfileGenerator";
import { ProfileValidationPanel } from "@/components/features/crawler/profiles/ProfileValidationPanel";

const sections = [
  "Resumo",
  "Onboarding",
  "Operações",
  "Discoveries",
  "Perfis de Extração",
  "Snapshots",
  "Agendamento",
];

interface CrawlAgencyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CrawlAgencyDetailPage({ params }: CrawlAgencyDetailPageProps) {
  const { id } = await params;
  const agencyId = Number(id);
  const [agency, snapshots, profiles, contracts] = await Promise.all([
    getCrawlAgency(agencyId),
    listDiscoverySnapshots(agencyId),
    listExtractionProfiles(agencyId),
    listMarketDataContracts(),
  ]);

  return (
    <section className="space-y-6">
      <Link className="text-sm underline" href="/admin/crawler/agencies">Voltar para Crawl Agencies</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold">{agency.name}</h2>
        <Badge variant="outline">{agency.lifecycle_state}</Badge>
        <Badge variant="secondary">Saúde: {agency.health_state}</Badge>
      </div>
      <nav aria-label="Seções da Crawl Agency" className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <a className="rounded-md border px-3 py-2 text-sm" href={`#${section.toLocaleLowerCase("pt-BR").replaceAll(" ", "-")}`} key={section}>
            {section}
          </a>
        ))}
      </nav>
      <Card id="resumo">
        <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div><p className="text-sm text-muted-foreground">ID estável</p><p>{agency.id}</p></div>
          <div><p className="text-sm text-muted-foreground">Domínio</p><p>{agency.root_domain}</p></div>
          <div><p className="text-sm text-muted-foreground">URL base</p><p>{agency.base_url}</p></div>
          <div><p className="text-sm text-muted-foreground">Slug</p><p>{agency.slug}</p></div>
        </CardContent>
      </Card>
      <Card id="onboarding">
        <CardHeader><CardTitle>Onboarding e Perfil de Extração</CardTitle></CardHeader>
        <CardContent><ExtractionProfileGenerator agencyId={agency.id} snapshots={snapshots} contracts={contracts} /></CardContent>
      </Card>
      <Card id="perfis-de-extração">
        <CardHeader><CardTitle>Perfis de Extração</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {profiles.map((profile) => <ProfileValidationPanel agencyLifecycle={agency.lifecycle_state} initialProfile={profile} key={profile.id} />)}
        </CardContent>
      </Card>
    </section>
  );
}
