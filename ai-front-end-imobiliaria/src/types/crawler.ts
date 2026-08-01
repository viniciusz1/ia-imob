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
  active_discovery_policy_version_id?: number | null;
  active_discovery_policy?: ResolvedOnboardingPolicy | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedCrawlAgencies {
  data: CrawlAgency[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
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
  discovery_policy: ResolvedOnboardingPolicy | null;
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

export type DiscoverySnapshotUrlPageSize = 20 | 30 | 100;

export interface PaginatedDiscoverySnapshotUrls {
  data: DiscoverySnapshotUrl[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: DiscoverySnapshotUrlPageSize;
    total: number;
  };
}

export interface DiscoverySnapshot {
  id: number;
  operation_id: number;
  crawl_agency_id: number;
  url_count: number;
  content_hash: string;
  created_at: string;
}

export interface OnboardingDiscoverySnapshotCandidate extends DiscoverySnapshot {
  adoption: {
    eligible: boolean;
    reason: string | null;
    sample_url: string | null;
    age_warning: string | null;
  };
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
  decider?: { id: number; name: string } | null;
  decided_at: string | null;
  decision_reason: string | null;
  activated_by: number | null;
  activator?: { id: number; name: string } | null;
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
  records?: ProfileValidationRecord[];
  created_at: string;
}

export interface PaginatedProfileValidationRecords {
  data: ProfileValidationRecord[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
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

export type OnboardingCatalogStatus = "draft" | "available" | "archived";

export interface DiscoveryStrategy {
  id: number;
  key: string;
  label: string;
  kind: "native" | "custom";
  safety_status: "safe" | "blocked";
  active: boolean;
  created_by: number | null;
  created_at: string;
}

export interface DiscoveryPolicyConfiguration {
  max_urls?: number;
  include_subdomains?: boolean;
  use_browser_for_homepage?: boolean;
  query?: string | null;
  score_threshold?: number;
  probe_paths?: string[];
  common_subdomains?: string[];
}

export interface DiscoveryPolicyVersion {
  id: number;
  policy_key: string;
  name: string;
  version: number;
  status: OnboardingCatalogStatus;
  strategies: string[];
  configuration: DiscoveryPolicyConfiguration;
  mutable: boolean;
  model_reference_count: number;
  active_model_reference_count: number;
  created_by: number;
  created_at: string;
}

export type ExtractionStrategy =
  | "xpath"
  | "css"
  | "fit_markdown_regex"
  | "fit_markdown_llm"
  | "llm_full_html";

export interface ExtractionPolicyVersion {
  id: number;
  policy_key: string;
  name: string;
  version: number;
  status: OnboardingCatalogStatus;
  strategies: ExtractionStrategy[];
  configuration: Record<string, unknown>;
  mutable: boolean;
  model_reference_count: number;
  active_model_reference_count: number;
  created_by: number;
  created_at: string;
}

export interface OnboardingExecutionModelVersion {
  id: number;
  model_key: string;
  name: string;
  version: number;
  status: OnboardingCatalogStatus;
  is_default: boolean;
  mutable: boolean;
  discovery_policy_version_id: number;
  discovery_policy: DiscoveryPolicyVersion;
  extraction_policy_version_id: number;
  extraction_policy: ExtractionPolicyVersion;
  plan_reference_count: number;
  execution_reference_count: number;
  created_by: number;
  created_at: string;
}

export type OnboardingConduction = "manual" | "automated";
export type FirstProductionDiscoveryMode = "fresh" | "validation_snapshot";

export interface OnboardingPointConfiguration<TStrategy extends string = string> {
  strategies: TStrategy[];
  configuration: Record<string, unknown>;
}

export interface ManualOnboardingConfiguration {
  discovery: {
    mode: "fresh" | "existing";
    discovery_snapshot_id?: number | null;
    policy_version_id?: number | null;
    point_configuration?: OnboardingPointConfiguration<string> | null;
  };
  extraction: {
    policy_version_id?: number | null;
    point_configuration?: OnboardingPointConfiguration<ExtractionStrategy> | null;
  };
}

export interface OnboardingPlan {
  id: number;
  prospect_id: number;
  crawl_agency_id: number;
  name: string | null;
  conduction: OnboardingConduction | null;
  status: "draft" | "in_progress" | "completed";
  steps: Array<{ key: string; state: string }>;
  execution_model_version_id: number | null;
  execution_model: OnboardingExecutionModelVersion | null;
  manual_configuration: ManualOnboardingConfiguration | null;
  first_production_discovery_mode: FirstProductionDiscoveryMode;
  confirmed_by: number | null;
  confirmed_at: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface OnboardingPlanInput {
  name: string;
  conduction: OnboardingConduction;
  execution_model_version_id?: number | null;
  manual_configuration?: ManualOnboardingConfiguration | null;
  first_production_discovery_mode: FirstProductionDiscoveryMode;
}

export interface ResolvedOnboardingPolicy {
  id: number | null;
  name: string;
  version: number | null;
  source: "catalog" | "point_configuration" | "agency_active" | "manual_override";
  strategies: string[];
  configuration: Record<string, unknown>;
}

export type OnboardingExecutionState =
  | "queued"
  | "running"
  | "awaiting_manual_step"
  | "requires_attention"
  | "awaiting_approval"
  | "awaiting_first_production"
  | "completed"
  | "cancelled";

export type OnboardingExecutionStepKey =
  | "discovery"
  | "sample_url_confirmation"
  | "profile_generation"
  | "profile_validation"
  | "approval"
  | "first_production"
  | "quality_gate";

export type OnboardingExecutionAction =
  | "run_discovery"
  | "confirm_sample_url"
  | "run_profile_generation"
  | "run_profile_validation"
  | "correct_sample_url";

export type OnboardingRecoveryCategory = "transient" | "configuration" | "unknown";

export type OnboardingRecoveryActionKey =
  | "review_configuration"
  | "retry_failed_operation"
  | "retry_first_production"
  | "review_attention"
  | "use_existing_discovery_snapshot"
  | "create_custom_discovery";

export interface OnboardingRecoveryAction {
  key: OnboardingRecoveryActionKey;
  priority: "primary" | "secondary";
  enabled: boolean;
  reason: string;
}

export interface OnboardingExecutionOperation {
  id: number;
  type: string;
  state: CrawlerOperationState;
  step: OnboardingExecutionStepKey;
  attempt: number;
  retry_of_operation_id: number | null;
  progress: {
    stage: string;
    percentage: number;
    message: string | null;
  };
  result: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
  created_at: string;
  completed_at: string | null;
}

export interface OnboardingExecution {
  id: number;
  onboarding_plan_id: number;
  crawl_agency_id: number;
  name: string;
  conduction: OnboardingConduction;
  state: OnboardingExecutionState;
  current_step: OnboardingExecutionStepKey;
  execution_model_version_id: number | null;
  discovery_policy_version_id: number | null;
  extraction_policy_version_id: number | null;
  discovery_snapshot_id: number | null;
  discovery_adoption: {
    discovery_snapshot_id: number;
    source_operation_id: number;
    replaced_operation_id: number;
    adopted_by: { id: number; name: string } | null;
    original_discovery_configuration: ResolvedOnboardingPolicy;
    note: string | null;
    adopted_at: string;
  } | null;
  market_data_contract_version_id: number;
  extraction_profile_id: number | null;
  profile_validation_report_id: number | null;
  first_production_discovery_mode: FirstProductionDiscoveryMode;
  first_production_crawl_run_id: number | null;
  created_by: { id: number; name: string };
  resolved_configuration: {
    version: number;
    execution_model: { id: number; name: string; version: number } | null;
    discovery: { mode: "fresh" | "existing"; discovery_snapshot_id?: number | null };
    discovery_policy: ResolvedOnboardingPolicy;
    extraction_policy: ResolvedOnboardingPolicy;
    market_data_contract: { id: number; version: number; fields: MarketDataField[] };
  };
  sample_url: string | null;
  sample_url_selection: Record<string, unknown> | null;
  attention: {
    code: string;
    category: OnboardingRecoveryCategory | null;
    message: string | null;
  } | null;
  approval: { approved_by: number; approved_at: string; reason: string | null } | null;
  first_production: {
    crawl_run_id: number;
    technical_state: CrawlRun["technical_state"];
    publication_state: CrawlRun["publication_state"];
    quality_verdict: "approved" | "blocked" | null;
  } | null;
  steps: Array<{
    key: OnboardingExecutionStepKey;
    state: string;
    operation_id: number | null;
    attempt: number | null;
  }>;
  operations: OnboardingExecutionOperation[];
  recovery_actions: OnboardingRecoveryAction[];
  next_action:
    | OnboardingExecutionAction
    | "wait_for_coordinator"
    | "wait_for_current_operation"
    | "decide_onboarding"
    | "start_first_production"
    | "retry_first_production"
    | "retry_failed_operation"
    | "review_configuration"
    | "review_attention"
    | null;
  started_at: string | null;
  paused_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
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
  onboarding_plan: Pick<OnboardingPlan, "id" | "status" | "steps">;
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
