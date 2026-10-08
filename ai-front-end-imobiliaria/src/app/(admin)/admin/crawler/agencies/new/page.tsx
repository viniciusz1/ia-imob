import { CrawlAgencyForm } from "@/components/features/crawler/agencies/CrawlAgencyForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default function NewCrawlAgencyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/admin/crawler/agencies"
        description="Cadastre uma nova fonte de dados de mercado para o Crawler."
        title="Nova Crawl Agency"
      />
      <CrawlAgencyForm />
    </div>
  );
}
