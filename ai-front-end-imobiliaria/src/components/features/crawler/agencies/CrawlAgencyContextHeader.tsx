import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { HealthBadge, LifecycleBadge } from "@/components/features/crawler/CrawlerStatusBadges";
import { Button } from "@/components/ui/button";
import type { CrawlAgency } from "@/types/crawler";

import { CrawlAgencyNavigation } from "./CrawlAgencyNavigation";

interface CrawlAgencyContextHeaderProps {
  agency: CrawlAgency;
  area: string;
  description?: string;
}

/**
 * Page header shared by every Crawl Agency sub-screen: agency name and status,
 * the current area and the agency tabs. The topbar already shows the trail.
 */
export function CrawlAgencyContextHeader({ agency, area, description }: CrawlAgencyContextHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button asChild className="shrink-0" size="icon" title="Voltar para Crawl Agencies" variant="ghost">
          <Link aria-label="Voltar para Crawl Agencies" href="/admin/crawler/agencies">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl tracking-tight text-foreground sm:text-[1.75rem]">{agency.name}</h1>
            <LifecycleBadge state={agency.lifecycle_state} />
            <HealthBadge state={agency.health_state} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>{agency.root_domain}</span>
            <span aria-hidden="true">·</span>
            <h2 className="text-sm text-foreground">{area}</h2>
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>

      <CrawlAgencyNavigation agencyId={agency.id} />
    </header>
  );
}
