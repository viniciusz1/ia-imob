import Link from "next/link";

import type { CrawlAgency } from "@/types/crawler";

import { CrawlAgencyNavigation } from "./CrawlAgencyNavigation";

interface CrawlAgencyContextHeaderProps {
  agency: CrawlAgency;
  area: string;
  description?: string;
}

export function CrawlAgencyContextHeader({ agency, area, description }: CrawlAgencyContextHeaderProps) {
  const agencyHref = `/admin/crawler/agencies/${agency.id}`;

  return (
    <header className="space-y-5">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <li><Link className="cursor-pointer rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href="/admin/crawler/agencies">Crawl Agencies</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link className="cursor-pointer rounded-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={agencyHref}>{agency.name}</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-foreground">{area}</li>
        </ol>
      </nav>

      <div className="space-y-3 border-l-4 border-primary pl-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold">{agency.name}</h1>
          <span className="text-sm text-muted-foreground">{agency.root_domain}</span>
        </div>
        <div>
          <h2 className="text-xl font-semibold">{area}</h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>

      <CrawlAgencyNavigation agencyId={agency.id} />
    </header>
  );
}
