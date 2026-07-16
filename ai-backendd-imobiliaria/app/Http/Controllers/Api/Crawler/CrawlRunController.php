<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Resources\Crawler\CrawlRunResource;
use App\Models\CrawlerRun;

class CrawlRunController extends Controller
{
    public function show(CrawlerRun $crawlRun): CrawlRunResource
    {
        return new CrawlRunResource($crawlRun);
    }
}
