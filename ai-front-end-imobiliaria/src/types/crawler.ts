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
  current_published_crawl_run_id: number | null;
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
  retry_of_operation_id: number | null;
  equivalence_key: string | null;
  plan: Record<string, unknown>;
  progress: CrawlerOperationProgress;
  result: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
  discovery_snapshot_id: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface OperationGroup {
  id: number;
  name: string;
  action: string;
  member_count: number;
  progress_percentage: number;
  result: "in_progress" | "succeeded" | "failed" | "partial";
  operations: CrawlerOperation[];
  created_at: string;
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

export interface DiscoverySnapshot {
  id: number;
  operation_id: number;
  crawl_agency_id: number;
  url_count: number;
  content_hash: string;
  created_at: string;
}

export interface ExtractionProfile {
  id: number;
  crawl_agency_id: number;
  discovery_snapshot_id: number;
  market_data_contract_version_id: number;
  version: number;
  status: "candidate" | "approved" | "rejected" | "active" | "revalidation_required";
  sample_url: string;
  schemas: Record<string, unknown>;
  strategies: string[];
  fields: MarketDataField[];
  parameters: Record<string, unknown>;
  decided_by: number | null;
  decided_at: string | null;
  decision_reason: string | null;
  activated_by: number | null;
  activated_at: string | null;
  latest_validation_report: ProfileValidationReport | null;
  created_at: string;
}

export interface ProfileValidationRecord {
  id: number;
  url: string;
  raw_data: Record<string, unknown> | null;
  normalized_data: Record<string, unknown> | null;
  errors: string[];
  field_presence: Record<string, boolean>;
  is_valid: boolean;
}

export interface ProfileValidationReport {
  id: number;
  operation_id: number;
  extraction_profile_id: number;
  sampled_url_count: number;
  valid_record_count: number;
  valid_ratio: number;
  required_field_coverage: Record<string, number>;
  blocking_failures: string[];
  warnings: string[];
  eligible: boolean;
  records: ProfileValidationRecord[];
  created_at: string;
}

export interface CrawlRun {
  id: number;
  operation_id: number;
  crawl_agency_id: number;
  discovery_snapshot_id: number | null;
  extraction_profile_id: number;
  market_data_contract_version_id: number;
  quality_policy_version_id: number;
  technical_state: "running" | "succeeded" | "failed" | "cancelled";
  result_kind: "full" | "partial";
  publication_state: "candidate" | "quarantined" | "published";
  publishable: boolean;
  quality_report: QualityGateReport | null;
  exceptional_publication: { published_by: number; reason: string; published_at: string } | null;
  counts: { raw: number; normalized: number; rejected: number; errors: number };
  error_summary: Array<Record<string, unknown>>;
  started_at: string;
  completed_at: string | null;
  published_at: string | null;
  quarantined_at: string | null;
  created_at: string;
}

export interface QualityGateReport {
  id: number;
  verdict: "approved" | "blocked";
  blockers: string[];
  warnings: string[];
  evidence: Record<string, unknown>;
  market_data_contract_version_id: number;
  quality_policy_version_id: number;
  evaluated_at: string;
}

export interface QualityPolicy {
  id: number;
  version: number;
  status: "draft" | "validating" | "active";
  rules: {
    maximum_stock_drop_ratio: number;
    maximum_error_ratio: number;
    maximum_rejection_ratio: number;
  };
  created_by: number | null;
  activated_by: number | null;
  activated_at: string | null;
  created_at: string;
}

export interface CrawlRunRecord {
  id: number;
  url?: string | null;
  valor?: number | null;
  cidade?: string | null;
  bairro?: string | null;
  payload: Record<string, unknown>;
  raw_payload?: Record<string, unknown> | null;
  normalization_warnings?: string[];
  extraction_trace?: Record<string, string>;
  errors?: string[];
  missing_fields?: string[];
  listing_state?: "new" | "changed" | "unchanged" | "missing" | "removed" | "reappeared";
  inventory_state?: "active" | "missing" | "removed";
  absence_count?: number;
  listing_reason?: string | null;
  listing_key?: string;
  [key: string]: unknown;
}

export interface PaginatedCrawlRunRecords {
  data: CrawlRunRecord[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}
