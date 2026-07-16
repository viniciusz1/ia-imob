export type CrawlAgencyLifecycle = "onboarding" | "active" | "paused" | "archived";
export type CrawlAgencyHealth = "unknown" | "healthy" | "degraded" | "unavailable";

export interface CrawlAgency {
  id: number;
  name: string;
  slug: string;
  base_url: string;
  root_domain: string;
  lifecycle_state: CrawlAgencyLifecycle;
  health_state: CrawlAgencyHealth;
  revalidation_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface CrawlAgencyInput {
  name: string;
  slug: string;
  base_url: string;
  root_domain: string;
}
