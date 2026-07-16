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

export type SchedulePreset = "manual" | "daily" | "twice_weekly" | "weekly";

export interface ScheduleDefault {
  id: number;
  preset: SchedulePreset;
  timezone: string;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface CrawlAgencySchedule {
  id: number | null;
  crawl_agency_id: number;
  inherit_default: boolean;
  preset: SchedulePreset | null;
  timezone: string | null;
  effective_preset: SchedulePreset;
  effective_timezone: string;
  next_run_at: string | null;
  last_enqueued_at: string | null;
  suspended: boolean;
  suspension_reason: string | null;
  circuit: {
    state: "closed" | "open";
    consecutive_failures: number;
  };
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
  crawl_agency?: { id: number; name: string } | null;
  requester?: { id: number; name: string } | null;
  groups?: Array<{ id: number; name: string }>;
  worker?: { id: number; worker_key: string } | null;
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
  timeline?: Array<{
    stage: "queue" | "discovery" | "profile" | "crawl" | "filter" | "normalization" | "quality" | "publication";
    status: "pending" | "current" | "completed" | "failed" | "cancelled";
  }>;
  equivalent_failure_count?: number;
}

export interface CrawlerOperationFilters {
  type?: string;
  state?: CrawlerOperationState;
  crawl_agency_id?: number;
  group_id?: number;
  requested_by?: number;
  from?: string;
  to?: string;
}

export interface CrawlerAlert {
  kind: "circuit_open" | "operation_failure" | "quarantined_snapshot" | "worker_unavailable";
  title: string;
  detail: string | null;
  href: string;
}

export interface CrawlerOverview {
  agencies: {
    total: number;
    lifecycle: Record<CrawlAgencyLifecycle, number>;
    health: Record<CrawlAgencyHealth, number>;
  };
  operations: { active: number; failed: number };
  open_circuits: number;
  quarantined_snapshots: number;
  active_operations: CrawlerOperation[];
  recent_failures: CrawlerOperation[];
  alerts: CrawlerAlert[];
}

export interface CrawlerIntegration {
  key: string;
  label: string;
  availability: "configured" | "unavailable";
  credential_identifier: string | null;
}

export interface CrawlerIntegrationTest extends CrawlerIntegration {
  status: "configuration_valid" | "unavailable";
  message: string;
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

export interface Prospect {
  id: number;
  root_domain: string | null;
  google_place_id: string | null;
  name: string;
  city: string;
  state: string;
  base_url: string | null;
  phone: string | null;
  address: string | null;
  source: "google_places";
  automatic_classification: "candidate" | "rejected";
  automatic_reason: string | null;
  review_state: "pending" | "approved" | "rejected";
  reviewed_by: number | null;
  reviewed_at: string | null;
  review_reason: string | null;
  promoted_crawl_agency_id: number | null;
  latest_operation_id: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ProspectPromotion {
  crawl_agency: CrawlAgency;
  onboarding_plan: { id: number; status: "draft" | "in_progress" | "completed"; steps: Array<{ key: string; state: string }> };
}

export interface CrawlAgencySuggestion {
  id: number;
  crawl_agency_id: number;
  operation_id: number;
  differences: Record<string, unknown>;
  state: "pending" | "accepted" | "dismissed";
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
