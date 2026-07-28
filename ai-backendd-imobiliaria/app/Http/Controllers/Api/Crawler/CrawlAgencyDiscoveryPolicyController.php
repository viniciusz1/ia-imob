<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\ActivateCrawlAgencyDiscoveryPolicyRequest;
use App\Http\Resources\Crawler\CrawlAgencyResource;
use App\Models\Crawler\CrawlAgency;
use App\Services\Crawler\CrawlAgencyDiscoveryPolicyService;

class CrawlAgencyDiscoveryPolicyController extends Controller
{
    public function store(
        ActivateCrawlAgencyDiscoveryPolicyRequest $request,
        CrawlAgency $crawlAgency,
        CrawlAgencyDiscoveryPolicyService $service,
    ): CrawlAgencyResource {
        return new CrawlAgencyResource(
            $service->activateNewVersionFrom(
                $crawlAgency,
                $request->integer('source_policy_version_id'),
                $request->user(),
            ),
        );
    }
}
