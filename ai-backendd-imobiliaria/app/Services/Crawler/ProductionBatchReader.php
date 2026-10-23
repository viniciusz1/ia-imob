<?php

namespace App\Services\Crawler;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class ProductionBatchReader
{
    public function items(): Builder
    {
        $items = DB::table('crawler.operation_group_targets as target')
            ->leftJoin('crawler.operations as operation', 'operation.id', '=', 'target.operation_id')
            ->leftJoin('crawler.crawl_runs as run', 'run.operation_id', '=', 'operation.id')
            ->leftJoin('crawler.quality_gate_reports as quality', 'quality.crawl_run_id', '=', 'run.id')
            ->select('target.*', 'operation.state as technical_state', 'operation.stage',
                'operation.progress_percentage', 'operation.processed_items', 'operation.total_items',
                'operation.heartbeat_at', 'operation.error_code', 'operation.error_message',
                'operation.claimed_at', 'operation.completed_at as technical_completed_at',
                'run.id as crawl_run_id', 'run.publication_state', 'run.raw_count',
                'run.normalized_count', 'run.rejected_count', 'run.error_count',
                'run.extraction_profile_id', 'run.market_data_contract_version_id',
                'run.quality_policy_version_id', 'quality.verdict as quality_verdict',
                'quality.blockers', 'quality.warnings')
            ->selectRaw('COALESCE(quality.evaluated_at, operation.completed_at, target.created_at) as resolved_at')
            ->selectRaw(<<<'SQL'
                CASE
                    WHEN target.operation_id IS NULL THEN 'skipped'
                    WHEN operation.state IN ('failed', 'cancelled') THEN operation.state
                    WHEN operation.state = 'queued' THEN 'queued'
                    WHEN operation.state IN ('running', 'cancellation_requested') THEN 'running'
                    WHEN quality.verdict = 'blocked' THEN 'quarantined'
                    WHEN run.publication_state = 'published' THEN 'published'
                    WHEN run.publication_state = 'quarantined' THEN 'quarantined'
                    ELSE 'awaiting_quality'
                END as outcome
            SQL);

        return DB::query()->fromSub($items, 'items');
    }

    public function aggregates(): Builder
    {
        $query = $this->items()->select('operation_group_id')
            ->selectRaw('COUNT(*)::int as requested, COUNT(operation_id)::int as enqueued')
            ->selectRaw('MIN(claimed_at) as started_at, MAX(resolved_at) as resolved_at')
            ->selectRaw("COUNT(*) FILTER (WHERE technical_state = 'succeeded')::int as technical_succeeded")
            ->selectRaw('COALESCE(SUM(raw_count), 0)::int as raw, COALESCE(SUM(normalized_count), 0)::int as normalized, COALESCE(SUM(rejected_count), 0)::int as rejected');
        foreach (['queued', 'running', 'awaiting_quality', 'published', 'quarantined', 'failed', 'cancelled', 'skipped'] as $outcome) {
            $query->selectRaw("COUNT(*) FILTER (WHERE outcome = ?)::int as {$outcome}", [$outcome]);
        }

        return $query->groupBy('operation_group_id');
    }

    public function batches(): Builder
    {
        return DB::table('crawler.operation_groups as batch')
            ->leftJoinSub($this->aggregates(), 'totals', 'totals.operation_group_id', '=', 'batch.id')
            ->leftJoin('users as requester', 'requester.id', '=', 'batch.requested_by')
            ->where('batch.action', 'bulk_production_crawl')
            ->select('batch.*', 'requester.name as requester_name', 'totals.started_at', 'totals.resolved_at')
            ->selectRaw("CASE WHEN COALESCE(totals.running, 0) > 0 THEN 'running'
                WHEN COALESCE(totals.queued, 0) > 0 THEN 'queued'
                WHEN COALESCE(totals.awaiting_quality, 0) > 0 THEN 'awaiting_quality'
                ELSE 'completed' END as state")
            ->addSelect(array_map(fn ($key) => DB::raw("COALESCE(totals.{$key}, 0)::int as {$key}"), [
                'requested', 'enqueued', 'technical_succeeded', 'raw', 'normalized', 'rejected',
                'queued', 'running', 'awaiting_quality', 'published', 'quarantined', 'failed', 'cancelled', 'skipped',
            ]));
    }

    public function find(int $id): array
    {
        $batch = $this->batches()->where('batch.id', $id)->first();
        abort_if($batch === null, 404);

        return $this->serialize($batch);
    }

    public function serialize(object $batch): array
    {
        $counts = [];
        foreach (['requested', 'enqueued', 'technical_succeeded', 'raw', 'normalized', 'rejected', 'queued', 'running', 'awaiting_quality', 'published', 'quarantined', 'failed', 'cancelled', 'skipped'] as $key) {
            $counts[$key] = (int) $batch->$key;
        }
        $resolved = $counts['published'] + $counts['quarantined'] + $counts['failed'] + $counts['cancelled'] + $counts['skipped'];
        $result = $batch->state !== 'completed' ? 'in_progress' : (
            $counts['enqueued'] === 0 ? 'not_executed' : (
                $counts['published'] === $counts['requested'] ? 'succeeded' : (
                    $counts['published'] > 0 ? 'partial' : 'failed'
                )
            )
        );
        if (! $batch->targets_complete) {
            $counts['requested'] = null;
            $counts['skipped'] = null;
        }

        return [
            'id' => $batch->id, 'name' => $batch->name, 'source_group_id' => $batch->source_group_id,
            'requester' => ['id' => $batch->requested_by, 'name' => $batch->requester_name],
            'state' => $batch->state, 'result' => $result, 'counts' => $counts,
            'progress_percentage' => $batch->requested > 0 ? (int) round(100 * $resolved / $batch->requested) : null,
            'historical_incomplete' => ! $batch->targets_complete,
            'created_at' => $batch->created_at, 'started_at' => $batch->started_at,
            'completed_at' => $batch->state === 'completed' ? ($batch->resolved_at ?? $batch->created_at) : null,
        ];
    }
}
