export type BatchState =
  "queued" | "running" | "awaiting_quality" | "completed";
export type BatchOutcome =
  | "queued"
  | "running"
  | "awaiting_quality"
  | "published"
  | "quarantined"
  | "failed"
  | "cancelled"
  | "skipped";
export interface BatchPage<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
export interface ProductionBatch {
  id: number;
  name: string;
  source_group_id: number | null;
  requester: { id: number; name: string };
  state: BatchState;
  result: "in_progress" | "not_executed" | "succeeded" | "partial" | "failed";
  historical_incomplete: boolean;
  counts: Record<
    | "enqueued"
    | "technical_succeeded"
    | "raw"
    | "normalized"
    | "rejected"
    | Exclude<BatchOutcome, "skipped">,
    number
  > & { requested: number | null; skipped: number | null };
  progress_percentage: number | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}
export interface ProductionBatchItem {
  id: number;
  crawl_agency_id: number;
  operation_id: number | null;
  name: string;
  root_domain: string;
  outcome: BatchOutcome;
  technical_state: string | null;
  stage: string | null;
  attention_code: string | null;
  progress_percentage: number | null;
  processed_items: number | null;
  total_items: number | null;
  heartbeat_at: string | null;
  skip_code: string | null;
  skip_message: string | null;
  error_code: string | null;
  error_message: string | null;
  crawl_run_id: number | null;
  publication_state: string | null;
  quality_verdict: string | null;
  raw_count: number | null;
  normalized_count: number | null;
  rejected_count: number | null;
  error_count: number | null;
  extraction_profile_id: number | null;
  market_data_contract_version_id: number | null;
  quality_policy_version_id: number | null;
  blockers: string[];
  warnings: string[];
}
export interface BatchDiagnostic {
  event_id: string;
  operation_id: number;
  schema_version: number;
  kind: string;
  stage: string;
  url: string | null;
  strategy: string | null;
  outcome: string;
  duration_ms: number;
  error_code: string | null;
  message: string | null;
  fields_present: string[];
  fields_missing: string[];
  fallback: boolean;
  created_at: string;
}
export interface BatchDiagnosticsPage extends BatchPage<BatchDiagnostic> {
  summary: {
    errors: Array<{
      stage: string;
      strategy: string | null;
      error_code: string;
      occurrences: number;
      affected_operations: number;
    }>;
    strategies: Array<{
      strategy: string;
      attempts: number;
      failed: number;
      fallback_contributions: number;
      duration_ms: number;
    }>;
    fields: Array<{ name: string; processed: number; present: number }>;
    stages: Array<{ stage: string; events: number; duration_ms: number }>;
  };
}
export interface BatchFilters {
  page?: number;
  per_page?: number;
  state?: string;
  from?: string;
  to?: string;
}
export interface BatchItemFilters {
  page?: number;
  per_page?: number;
  search?: string;
  outcome?: string;
}
export interface BatchDiagnosticFilters {
  page?: number;
  per_page?: number;
  operation_id?: number;
  stage?: string;
  strategy?: string;
  field?: string;
  outcome?: string;
  error_code?: string;
}
