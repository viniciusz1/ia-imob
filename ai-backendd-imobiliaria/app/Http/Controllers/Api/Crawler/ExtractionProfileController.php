<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\GenerateExtractionProfileRequest;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Http\Resources\Crawler\ExtractionProfileResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\ExtractionProfile;
use App\Models\Crawler\MarketDataContractVersion;
use App\Services\Crawler\CrawlerOperationService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExtractionProfileController extends Controller
{
    public function index(CrawlAgency $crawlAgency): AnonymousResourceCollection
    {
        return ExtractionProfileResource::collection(
            ExtractionProfile::query()
                ->with(['latestValidationReport', 'decider', 'activator'])
                ->where('crawl_agency_id', $crawlAgency->id)
                ->orderByDesc('version')
                ->get()
        );
    }

    public function generate(
        GenerateExtractionProfileRequest $request,
        CrawlerOperationService $service,
    ): CrawlerOperationResource {
        $operation = $service->queueProfileGeneration(
            CrawlAgency::query()->findOrFail($request->integer('crawl_agency_id')),
            DiscoverySnapshot::query()->findOrFail($request->integer('discovery_snapshot_id')),
            MarketDataContractVersion::query()->findOrFail($request->integer('market_data_contract_version_id')),
            $request->string('sample_url')->toString(),
            $request->user(),
        );

        return new CrawlerOperationResource($operation);
    }
}
