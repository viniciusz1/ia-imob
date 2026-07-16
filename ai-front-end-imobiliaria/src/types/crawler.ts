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

export type MarketDataFieldType = "string" | "integer" | "decimal" | "boolean" | "date" | "url" | "array";

export interface MarketDataField {
  name: string;
  type: MarketDataFieldType;
  required: boolean;
  normalization: string[];
}

export interface AffectedCrawlAgency {
  id: number;
  name: string;
  root_domain: string;
}

export interface MarketDataContract {
  id: number;
  version: number;
  status: "draft" | "validating" | "active" | "superseded";
  fields: MarketDataField[];
  compatibility: "additive_optional" | "incompatible" | null;
  affected_agencies: AffectedCrawlAgency[];
  created_by: number;
  activated_by: number | null;
  activated_at: string | null;
  created_at: string;
}
