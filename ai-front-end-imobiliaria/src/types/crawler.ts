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

export type CrawlerOperationState = "queued" | "running" | "cancellation_requested" | "succeeded" | "failed" | "cancelled";

export interface CrawlerOperationProgress {
  stage: string;
  percentage: number;
  processed: number;
  total: number | null;
  message: string | null;
  heartbeat_at: string | null;
}

export interface CrawlerOperation {
  id: number;
  type: string;
  state: CrawlerOperationState;
  crawl_agency_id: number | null;
  market_data_contract_version_id: number | null;
  plan: Record<string, unknown>;
  progress: CrawlerOperationProgress;
  result: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
  discovery_snapshot_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface WorkerInstance {
  id: number;
  worker_key: string;
  version: string;
  capacity: Record<string, number>;
  health_state: string;
  last_heartbeat_at: string;
}

export interface DiscoverySnapshotUrl {
  id: number;
  url: string;
  created_at: string;
}
