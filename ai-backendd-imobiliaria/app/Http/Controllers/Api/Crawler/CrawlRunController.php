<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlRunResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\CrawlerRun;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CrawlRunController extends Controller
{
    public function index(CrawlAgency $crawlAgency): AnonymousResourceCollection
    {
        return CrawlRunResource::collection(
            CrawlerRun::query()
                ->where('crawl_agency_id', $crawlAgency->id)
                ->with(['qualityReport', 'exceptionalPublication'])
                ->latest('id')
                ->get()
        );
    }

    public function show(CrawlerRun $crawlRun): CrawlRunResource
    {
        return new CrawlRunResource($crawlRun->load(['qualityReport', 'exceptionalPublication']));
    }
}
