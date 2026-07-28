<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\ListDiscoverySnapshotUrlsRequest;
use App\Http\Resources\Crawler\DiscoverySnapshotResource;
use App\Http\Resources\Crawler\DiscoverySnapshotUrlResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\DiscoverySnapshot;
use App\Services\Crawler\DiscoverySnapshotService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiscoverySnapshotController extends Controller
{
    public function __construct(protected DiscoverySnapshotService $service) {}

    public function index(CrawlAgency $crawlAgency): AnonymousResourceCollection
    {
        return DiscoverySnapshotResource::collection(
            $this->service->listForAgency($crawlAgency)
        );
    }

    public function urls(ListDiscoverySnapshotUrlsRequest $request, DiscoverySnapshot $discoverySnapshot): AnonymousResourceCollection
    {
        return DiscoverySnapshotUrlResource::collection(
            $this->service->paginateUrls($discoverySnapshot, $request->integer('per_page', 20))
        );
    }
}
