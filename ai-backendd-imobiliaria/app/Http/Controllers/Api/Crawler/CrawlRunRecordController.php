<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Models\CrawlerRun;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CrawlRunRecordController extends Controller
{
    public function index(Request $request, CrawlerRun $crawlRun): JsonResponse
    {
        $input = $request->validate([
            'view' => ['required', Rule::in(['normalized', 'raw', 'rejected'])],
            'search' => ['nullable', 'string', 'max:200'],
            'sort' => ['nullable', 'string'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $view = $input['view'];
        $query = $this->query($crawlRun->id, $view);
        $this->applySearch($query, $view, trim((string) ($input['search'] ?? '')));
        $this->applySort($query, $view, (string) ($input['sort'] ?? '-created_at'));
        $paginator = $query->paginate((int) ($input['per_page'] ?? 25));

        return response()->json([
            'data' => $paginator->getCollection()->map(fn ($row): array => $this->serialize($row, $view))->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    private function query(int $runId, string $view): Builder
    {
        if ($view === 'normalized') {
            return DB::table('crawler.market_properties as market')
                ->leftJoin('crawler.raw_properties as raw', 'raw.id', '=', 'market.raw_property_id')
                ->where('market.crawler_run_id', $runId)
                ->select('market.*', 'raw.payload as raw_payload');
        }

        return DB::table("crawler.{$view}_properties")
            ->where('crawler_run_id', $runId);
    }

    private function applySearch(Builder $query, string $view, string $search): void
    {
        if ($search === '') {
            return;
        }
        if ($view === 'normalized') {
            $query->where(function (Builder $query) use ($search): void {
                $query->where('market.cidade', 'ilike', "%{$search}%")
                    ->orWhere('market.bairro', 'ilike', "%{$search}%")
                    ->orWhere('market.link_imovel', 'ilike', "%{$search}%")
                    ->orWhereRaw('market.payload::text ILIKE ?', ["%{$search}%"]);
            });

            return;
        }
        $query->where(function (Builder $query) use ($search): void {
            $query->where('url', 'ilike', "%{$search}%")
                ->orWhereRaw('payload::text ILIKE ?', ["%{$search}%"]);
        });
    }

    private function applySort(Builder $query, string $view, string $sort): void
    {
        $descending = str_starts_with($sort, '-');
        $field = ltrim($sort, '-');
        $allowed = $view === 'normalized'
            ? ['created_at', 'valor', 'cidade', 'bairro']
            : ['created_at', 'url'];
        if (! in_array($field, $allowed, true)) {
            $field = 'created_at';
        }
        $prefix = $view === 'normalized' ? 'market.' : '';
        $query->orderBy($prefix.$field, $descending ? 'desc' : 'asc')->orderBy($prefix.'id', 'desc');
    }

    private function serialize(object $row, string $view): array
    {
        $data = (array) $row;
        foreach (['payload', 'raw_payload', 'normalization_warnings', 'extraction_trace', 'errors', 'missing_fields'] as $field) {
            if (isset($data[$field]) && is_string($data[$field])) {
                $data[$field] = json_decode($data[$field], true, flags: JSON_THROW_ON_ERROR);
            }
        }
        foreach (['valor', 'area'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = (float) $data[$field];
            }
        }

        return $data;
    }
}
