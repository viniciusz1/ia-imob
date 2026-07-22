<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\QueueProductionCrawlRequest;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Services\Crawler\ProductionCrawlService;

class ProductionCrawlController extends Controller
{
    public function store(
        QueueProductionCrawlRequest $request,
        ProductionCrawlService $service,
    ): CrawlerOperationResource {
        return new CrawlerOperationResource($service->queue($request->validated(), $request->user()));
    }
}
