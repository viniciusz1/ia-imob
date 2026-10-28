import { CrawlAgencyLayoutShell } from "@/components/features/crawler/agencies/CrawlAgencyLayoutShell";
import { getCrawlAgency } from "@/services/crawlerService";

interface CrawlAgencyLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function CrawlAgencyLayout({
  children,
  params,
}: CrawlAgencyLayoutProps) {
  const { id } = await params;
  const agency = await getCrawlAgency(Number(id));

  return (
    <CrawlAgencyLayoutShell initialAgency={agency}>
      {children}
    </CrawlAgencyLayoutShell>
  );
}
