<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreCrawlerOperationRequest;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\MarketDataContractVersion;
use App\Services\Crawler\CrawlerOperationService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class CrawlerOperationController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'type' => ['nullable', 'string', 'max:64'],
            'state' => ['nullable', Rule::in(['queued', 'running', 'cancellation_requested', 'succeeded', 'failed', 'cancelled'])],
            'crawl_agency_id' => ['nullable', 'integer'],
            'group_id' => ['nullable', 'integer'],
            'requested_by' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);
        $query = CrawlerOperation::query()
            ->with(['discoverySnapshot', 'crawlAgency', 'groups', 'requester', 'worker'])
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($filters['state'] ?? null, fn ($query, $state) => $query->where('state', $state))
            ->when($filters['crawl_agency_id'] ?? null, fn ($query, $agencyId) => $query->where('crawl_agency_id', $agencyId))
            ->when($filters['group_id'] ?? null, fn ($query, $groupId) => $query->whereHas('groups', fn ($groupQuery) => $groupQuery->where('crawler.operation_groups.id', $groupId)))
            ->when($filters['requested_by'] ?? null, fn ($query, $requesterId) => $query->where('requested_by', $requesterId))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->where('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->where('created_at', '<=', $to));
        $operations = $query
            ->orderByDesc('created_at')
            ->paginate()
            ->withQueryString();
        $equivalentFailureCounts = CrawlerOperation::query()
            ->where('state', 'failed')
            ->whereNotNull('equivalence_key')
            ->selectRaw('equivalence_key, COUNT(*) AS aggregate')
            ->groupBy('equivalence_key')
            ->pluck('aggregate', 'equivalence_key');
        $operations->getCollection()->each(function (CrawlerOperation $operation) use ($equivalentFailureCounts): void {
            $operation->setAttribute(
                'equivalent_failure_count',
                $operation->equivalence_key === null ? 0 : (int) ($equivalentFailureCounts[$operation->equivalence_key] ?? 0),
            );
        });

        return CrawlerOperationResource::collection($operations);
    }

    public function store(
        StoreCrawlerOperationRequest $request,
        CrawlerOperationService $service,
    ): CrawlerOperationResource {
        $operation = $service->queueDiscovery(
            CrawlAgency::query()->findOrFail($request->integer('crawl_agency_id')),
            MarketDataContractVersion::query()->findOrFail($request->integer('market_data_contract_version_id')),
            $request->user(),
        );

        return new CrawlerOperationResource($operation);
    }

    public function show(CrawlerOperation $operation): CrawlerOperationResource
    {
        return new CrawlerOperationResource($operation->load(['discoverySnapshot', 'crawlAgency', 'groups', 'requester', 'worker']));
    }
}
