import { CrawlAgenciesClient } from "@/components/features/crawler/agencies/CrawlAgenciesClient";
import { listCrawlAgenciesPage } from "@/services/crawlerService";

interface CrawlAgenciesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

export default async function CrawlAgenciesPage({ searchParams }: CrawlAgenciesPageProps) {
  const query = await searchParams;
  const requestedPage = Number(first(query.page));
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const search = first(query.search)?.trim() ?? "";
  const agencies = await listCrawlAgenciesPage({
    page,
    ...(search !== "" && { search }),
  });

  return (
    <CrawlAgenciesClient
      initialAgencies={agencies.data}
      initialSearch={search}
      pageCount={agencies.meta.last_page}
    />
  );
}
