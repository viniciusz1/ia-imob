import { ProspectsClient } from "@/components/features/crawler/prospects/ProspectsClient";
import { listProspects } from "@/services/crawlerService";

export default async function ProspectsPage() {
  return <ProspectsClient initialProspects={await listProspects()} />;
}
