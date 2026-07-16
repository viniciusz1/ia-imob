<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreCrawlerOperationRequest;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\CrawlerOperation;
use App\Models\Crawler\MarketDataContractVersion;
use App\Services\Crawler\CrawlerOperationService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CrawlerOperationController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CrawlerOperationResource::collection(
            CrawlerOperation::query()
                ->with('discoverySnapshot')
                ->orderByDesc('created_at')
                ->paginate()
        );
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
        return new CrawlerOperationResource($operation->load('discoverySnapshot'));
    }
}
