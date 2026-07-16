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

        return CrawlAgencyResource::collection(
            CrawlAgency::query()
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($query) use ($search): void {
                        $query->where('name', 'ilike', "%{$search}%")
                            ->orWhere('root_domain', 'ilike', "%{$search}%");
                    });
                })
                ->when($request->filled('lifecycle_state'), fn ($query) => $query->where('lifecycle_state', $request->query('lifecycle_state')))
                ->when($request->filled('health_state'), fn ($query) => $query->where('health_state', $request->query('health_state')))
                ->orderBy('name')
                ->paginate()
        );
    }

    public function store(StoreCrawlAgencyRequest $request): CrawlAgencyResource
    {
        $crawlAgency = CrawlAgency::query()->create($request->validated());

        return new CrawlAgencyResource($crawlAgency->refresh());
    }

    public function show(CrawlAgency $crawlAgency): CrawlAgencyResource
    {
        return new CrawlAgencyResource($crawlAgency);
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

        return new CrawlAgencyResource($lifecycle->transition($crawlAgency, $target));
    }

    public function activate(
        CrawlAgency $crawlAgency,
        CrawlAgencyLifecycleService $lifecycle,
    ): CrawlAgencyResource {
        return new CrawlAgencyResource($lifecycle->transition($crawlAgency, CrawlAgencyLifecycle::Active));
    }

    public function update(UpdateCrawlAgencyRequest $request, CrawlAgency $crawlAgency): CrawlAgencyResource
    {
        $crawlAgency->update($request->validated());

        return new CrawlAgencyResource($crawlAgency->refresh());
    }
}
