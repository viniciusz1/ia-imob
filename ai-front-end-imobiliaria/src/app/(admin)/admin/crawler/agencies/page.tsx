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
  const requestedPerPage = Number(first(query.per_page));
  const perPage = Number.isInteger(requestedPerPage) && requestedPerPage > 0 ? requestedPerPage : 15;
  const lifecycle = first(query.lifecycle_state)?.trim() ?? "";

  const agencies = await listCrawlAgenciesPage({
    page,
    per_page: perPage,
    sort: "-updated_at",
    ...(search !== "" && { search }),
    ...(lifecycle !== "" && lifecycle !== "all" && { lifecycle_state: lifecycle }),
  });

  return (
    <CrawlAgenciesClient
      initialAgencies={agencies.data}
      initialLifecycle={lifecycle}
      initialPerPage={perPage}
      initialSearch={search}
      pageCount={agencies.meta.last_page}
      totalCount={agencies.meta.total}
    />
  );
}
