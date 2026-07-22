import { CrawlAgencyContextHeader } from "@/components/features/crawler/agencies/CrawlAgencyContextHeader";
import { CrawlAgencySchedulePanel } from "@/components/features/crawler/schedules/CrawlAgencySchedulePanel";
import { getCrawlAgency, getCrawlAgencySchedule } from "@/services/crawlerService";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const agencyId = Number((await params).id);
  const [agency, schedule] = await Promise.all([getCrawlAgency(agencyId), getCrawlAgencySchedule(agencyId)]);
  return <section className="space-y-6"><CrawlAgencyContextHeader agency={agency} area="Agendamento e segurança" description="Frequência, próxima execução e circuito da fonte." /><CrawlAgencySchedulePanel initialSchedule={schedule} /></section>;
}
