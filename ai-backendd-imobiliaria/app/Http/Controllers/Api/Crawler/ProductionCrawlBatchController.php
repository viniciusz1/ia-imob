<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Models\Crawler\OperationGroup;
use App\Services\Crawler\BulkProductionCrawlService;
use App\Services\Crawler\ProductionBatchReader;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProductionCrawlBatchController extends Controller
{
    public function index(Request $request, ProductionBatchReader $reader): JsonResponse
    {
        $input = $request->validate([
            'state' => ['nullable', Rule::in(['queued', 'running', 'awaiting_quality', 'completed'])],
            'from' => ['nullable', 'date'], 'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = DB::query()->fromSub($reader->batches(), 'batches')
            ->when($input['state'] ?? null, fn ($q, $state) => $q->where('state', $state))
            ->when($input['from'] ?? null, fn ($q, $from) => $q->where('created_at', '>=', $from))
            ->when($input['to'] ?? null, fn ($q, $to) => $q->where('created_at', '<=', $to))
            ->orderByDesc('created_at')->orderByDesc('id');
        $page = $query->paginate($input['per_page'] ?? 15);
        $page->through(fn ($row) => $reader->serialize($row));

        return $this->paginated($page);
    }

    public function show(OperationGroup $batch, ProductionBatchReader $reader): JsonResponse
    {
        $this->ensureBatch($batch);

        return response()->json(['data' => $reader->find($batch->id)]);
    }

    public function items(Request $request, OperationGroup $batch, ProductionBatchReader $reader): JsonResponse
    {
        $this->ensureBatch($batch);
        $input = $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'outcome' => ['nullable', Rule::in(['queued', 'running', 'awaiting_quality', 'published', 'quarantined', 'failed', 'cancelled', 'skipped'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $page = $reader->items()->where('operation_group_id', $batch->id)
            ->when($input['outcome'] ?? null, fn ($q, $outcome) => $q->where('outcome', $outcome))
            ->when($input['search'] ?? null, fn ($q, $search) => $q->where(fn ($q) => $q
                ->where('name', 'ilike', '%'.$search.'%')->orWhere('root_domain', 'ilike', '%'.$search.'%')))
            ->orderBy('id')->paginate($input['per_page'] ?? 25);
        $page->through(function ($item) {
            foreach (['blockers', 'warnings'] as $key) {
                $item->$key = json_decode($item->$key ?? '[]', true, flags: JSON_THROW_ON_ERROR);
            }

            foreach (['heartbeat_at', 'claimed_at', 'technical_completed_at', 'resolved_at', 'created_at'] as $key) {
                if ($item->$key !== null) {
                    $item->$key = CarbonImmutable::parse($item->$key)->toIso8601String();
                }
            }

            return $item;
        });

        return $this->paginated($page);
    }

    public function rerun(Request $request, OperationGroup $batch, ProductionBatchReader $reader, BulkProductionCrawlService $bulk): JsonResponse
    {
        $this->ensureBatch($batch);
        $input = $request->validate([
            'confirmed' => ['required', 'accepted'], 'request_key' => ['required', 'uuid'],
            'item_ids' => ['nullable', 'array', 'min:1', 'max:1000'],
            'item_ids.*' => ['required', 'integer', 'distinct'],
        ]);
        $eligible = $reader->items()->where('operation_group_id', $batch->id)
            ->whereIn('outcome', ['failed', 'cancelled', 'quarantined'])
            ->when($input['item_ids'] ?? null, fn ($q, $ids) => $q->whereIn('id', $ids))
            ->orderBy('crawl_agency_id')->get();
        if ($eligible->isEmpty() || (isset($input['item_ids']) && $eligible->count() !== count($input['item_ids']))) {
            throw ValidationException::withMessages(['item_ids' => 'Selecione apenas agências com falha, cancelamento ou quarentena deste lote.']);
        }
        $result = $bulk->queueTargets($request->user(), $input['request_key'], $eligible->pluck('crawl_agency_id')->all(), $batch->id);
        unset($result['group']);

        return response()->json(['data' => $result], 202);
    }

    public function diagnostics(Request $request, OperationGroup $batch): JsonResponse
    {
        $this->ensureBatch($batch);
        $input = $request->validate([
            'operation_id' => ['nullable', 'integer'], 'stage' => ['nullable', 'string', 'max:32'],
            'strategy' => ['nullable', 'string', 'max:64'], 'field' => ['nullable', 'string', 'max:128'],
            'outcome' => ['nullable', 'string', 'max:32'], 'error_code' => ['nullable', 'string', 'max:128'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = DB::table('crawler.operation_diagnostics')->whereIn('operation_id',
            DB::table('crawler.operation_group_targets')->where('operation_group_id', $batch->id)->whereNotNull('operation_id')->select('operation_id'));
        foreach (['operation_id', 'stage', 'strategy', 'outcome', 'error_code'] as $key) {
            if (isset($input[$key])) {
                $query->where($key, $input[$key]);
            }
        }
        if (isset($input['field'])) {
            $query->where(fn ($q) => $q->whereJsonContains('fields_missing', $input['field'])->orWhereJsonContains('fields_present', $input['field']));
        }
        $errors = (clone $query)->whereNotNull('error_code')->select('stage', 'strategy', 'error_code')
            ->selectRaw('COUNT(*)::int as occurrences, COUNT(DISTINCT operation_id)::int as affected_operations')
            ->groupBy('stage', 'strategy', 'error_code')->orderByDesc('occurrences')->limit(20)->get();
        $strategies = (clone $query)->where('kind', 'attempt')->select('strategy')
            ->selectRaw("COUNT(*)::int as attempts, COUNT(*) FILTER (WHERE outcome = 'failed')::int as failed, COUNT(*) FILTER (WHERE fallback AND jsonb_array_length(fields_present) > 0)::int as fallback_contributions, COALESCE(SUM(duration_ms), 0)::bigint as duration_ms")
            ->groupBy('strategy')->get();
        $fields = DB::query()->fromSub((clone $query)->where('kind', 'url_completed'), 'terminal')
            ->crossJoin(DB::raw('LATERAL jsonb_array_elements_text(terminal.fields_missing || terminal.fields_present) AS field(name)'))
            ->select('field.name')->selectRaw('COUNT(*)::int as processed, COUNT(*) FILTER (WHERE terminal.fields_present @> jsonb_build_array(field.name))::int as present')
            ->groupBy('field.name')->orderBy('field.name')->get();
        $stages = (clone $query)->select('stage')->selectRaw('COUNT(*)::int as events, COALESCE(SUM(duration_ms), 0)::bigint as duration_ms')->groupBy('stage')->get();
        $page = (clone $query)->orderByDesc('created_at')->orderBy('event_id')->paginate($input['per_page'] ?? 25);
        $page->through(function ($event) {
            $event->fields_present = json_decode($event->fields_present, true, flags: JSON_THROW_ON_ERROR);
            $event->fields_missing = json_decode($event->fields_missing, true, flags: JSON_THROW_ON_ERROR);

            $event->created_at = CarbonImmutable::parse($event->created_at)->toIso8601String();

            return $event;
        });

        return $this->paginated($page, ['summary' => ['errors' => $errors, 'strategies' => $strategies, 'fields' => $fields, 'stages' => $stages]]);
    }

    private function paginated(LengthAwarePaginator $page, array $extra = []): JsonResponse
    {
        return response()->json(['data' => $page->items(), 'meta' => [
            'current_page' => $page->currentPage(), 'last_page' => $page->lastPage(),
            'per_page' => $page->perPage(), 'total' => $page->total(),
        ]] + $extra);
    }

    private function ensureBatch(OperationGroup $batch): void
    {
        abort_unless($batch->action === 'bulk_production_crawl', 404);
    }
}
