<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlerOperationResource;
use App\Models\Crawler\CrawlAgency;
use App\Services\Crawler\CrawlerOperationService;
use Illuminate\Http\Request;

class SampleUrlSuggestionController extends Controller
{
    public function __invoke(
        Request $request,
        CrawlAgency $crawlAgency,
        CrawlerOperationService $service,
    ): CrawlerOperationResource {
        return new CrawlerOperationResource(
            $service->queueSampleUrlSuggestion($crawlAgency, $request->user())
        );
    }
}
