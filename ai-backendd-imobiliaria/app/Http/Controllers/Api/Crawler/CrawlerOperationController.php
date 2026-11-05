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
    private const STATES = ['queued', 'running', 'cancellation_requested', 'succeeded', 'failed', 'cancelled'];

    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'type' => ['nullable', 'string', 'max:64'],
            'state' => ['nullable', Rule::in(self::STATES)],
            'states' => ['nullable', 'array'],
            'states.*' => [Rule::in(self::STATES)],
            'sort' => ['nullable', Rule::in(['created_at', 'claimed_at', 'completed_at'])],
            'direction' => ['nullable', Rule::in(['asc', 'desc'])],
            'crawl_agency_id' => ['nullable', 'integer'],
            'group_id' => ['nullable', 'integer'],
            'requested_by' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);
        $query = CrawlerOperation::query()
            ->with(['discoverySnapshot', 'crawlAgency', 'groups', 'requester', 'worker'])
            ->when($filters['type'] ?? null, fn ($query, $type) => $query->where('type', $type))
            ->when($filters['state'] ?? null, fn ($query, $state) => $query->where('state', $state))
            ->when($filters['states'] ?? null, fn ($query, $states) => $query->whereIn('state', $states))
            ->when($filters['crawl_agency_id'] ?? null, fn ($query, $agencyId) => $query->where('crawl_agency_id', $agencyId))
            ->when($filters['group_id'] ?? null, fn ($query, $groupId) => $query->whereHas('groups', fn ($groupQuery) => $groupQuery->where('crawler.operation_groups.id', $groupId)))
            ->when($filters['requested_by'] ?? null, fn ($query, $requesterId) => $query->where('requested_by', $requesterId))
            ->when($filters['from'] ?? null, fn ($query, $from) => $query->where('created_at', '>=', $from))
            ->when($filters['to'] ?? null, fn ($query, $to) => $query->where('created_at', '<=', $to));
        $operations = $query
            ->orderBy($filters['sort'] ?? 'created_at', $filters['direction'] ?? 'desc')
            ->orderBy('id', $filters['direction'] ?? 'desc')
            ->paginate((int) ($filters['per_page'] ?? 15))
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
            $request->validated('discovery_policy'),
        );

        return new CrawlerOperationResource($operation);
    }

    public function show(CrawlerOperation $operation): CrawlerOperationResource
    {
        return new CrawlerOperationResource($operation->load(['discoverySnapshot', 'crawlAgency', 'groups', 'requester', 'worker']));
    }

    public function profileWorkflow(CrawlAgency $crawlAgency): AnonymousResourceCollection
    {
        $query = CrawlerOperation::query()
            ->with(['discoverySnapshot', 'crawlAgency', 'groups', 'requester', 'worker'])
            ->where('crawl_agency_id', $crawlAgency->id)
            ->whereIn('type', ['sample_url_suggestion', 'profile_generation', 'profile_validation']);
        $active = (clone $query)
            ->whereIn('state', ['queued', 'running', 'cancellation_requested'])
            ->get();
        $recentTerminal = (clone $query)
            ->whereIn('state', ['failed', 'cancelled'])
            ->latest('created_at')
            ->limit(10)
            ->get();
        $operations = $active
            ->concat($recentTerminal)
            ->unique('id')
            ->sortByDesc('created_at')
            ->values();

        return CrawlerOperationResource::collection($operations);
    }
}
