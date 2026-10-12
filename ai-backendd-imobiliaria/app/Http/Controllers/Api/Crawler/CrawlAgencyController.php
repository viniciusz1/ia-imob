<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Enums\Crawler\CrawlAgencyLifecycle;
use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreCrawlAgencyRequest;
use App\Http\Requests\Crawler\TransitionCrawlAgencyRequest;
use App\Http\Requests\Crawler\UpdateCrawlAgencyRequest;
use App\Http\Resources\Crawler\CrawlAgencyResource;
use App\Models\Crawler\CrawlAgency;
use App\Services\Crawler\CrawlAgencyLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CrawlAgencyController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = min(100, max(1, $request->integer('per_page', 15)));
        $sort = (string) $request->query('sort', '');

        return CrawlAgencyResource::collection(
            CrawlAgency::query()
                ->with('activeDiscoveryPolicy')
                ->select('crawler.crawl_agencies.*')
                ->selectRaw('
                    GREATEST(
                        (SELECT MAX(COALESCE(completed_at, started_at, created_at)) FROM crawler.crawl_runs WHERE crawl_agency_id = crawler.crawl_agencies.id),
                        (SELECT MAX(COALESCE(completed_at, claimed_at, created_at)) FROM crawler.operations WHERE crawl_agency_id = crawler.crawl_agencies.id AND type IN (\'production_crawl\', \'profile_validation\'))
                    ) as last_crawled_at
                ')
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($query) use ($search): void {
                        $query->where('name', 'ilike', "%{$search}%")
                            ->orWhere('root_domain', 'ilike', "%{$search}%");
                    });
                })
                ->when($request->filled('lifecycle_state'), fn ($query) => $query->where('lifecycle_state', $request->query('lifecycle_state')))
                ->when($request->filled('health_state'), fn ($query) => $query->where('health_state', $request->query('health_state')))
                ->when(
                    $sort === '-last_crawled_at',
                    fn ($query) => $query->orderByRaw('last_crawled_at DESC NULLS LAST')->orderBy('name'),
                    fn ($query) => $query->when(
                        $sort === '-updated_at',
                        fn ($q) => $q->orderByDesc('updated_at')->orderBy('name'),
                        fn ($q) => $q->orderBy('name'),
                    ),
                )
                ->paginate($perPage)
        );
    }

    public function store(StoreCrawlAgencyRequest $request): CrawlAgencyResource
    {
        $crawlAgency = CrawlAgency::query()->create($request->validated());

        return new CrawlAgencyResource($crawlAgency->refresh()->load('activeDiscoveryPolicy'));
    }

    public function show(CrawlAgency $crawlAgency): CrawlAgencyResource
    {
        return new CrawlAgencyResource($crawlAgency->load('activeDiscoveryPolicy'));
    }

    public function transition(
        TransitionCrawlAgencyRequest $request,
        CrawlAgency $crawlAgency,
        CrawlAgencyLifecycleService $lifecycle,
    ): CrawlAgencyResource {
        $target = CrawlAgencyLifecycle::from($request->validated('lifecycle_state'));

        if ($target === CrawlAgencyLifecycle::Active) {
            abort_unless($request->user()->can('crawler.agencies.activate'), 403);
        }

        return new CrawlAgencyResource(
            $lifecycle->transition($crawlAgency, $target)->load('activeDiscoveryPolicy'),
        );
    }

    public function activate(
        CrawlAgency $crawlAgency,
        CrawlAgencyLifecycleService $lifecycle,
    ): CrawlAgencyResource {
        return new CrawlAgencyResource(
            $lifecycle->transition($crawlAgency, CrawlAgencyLifecycle::Active)
                ->load('activeDiscoveryPolicy'),
        );
    }

    public function update(UpdateCrawlAgencyRequest $request, CrawlAgency $crawlAgency): CrawlAgencyResource
    {
        $crawlAgency->update($request->validated());

        return new CrawlAgencyResource($crawlAgency->refresh()->load('activeDiscoveryPolicy'));
    }
}
