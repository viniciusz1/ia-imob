<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\SaveOnboardingPlanInlinePolicyRequest;
use App\Http\Requests\Crawler\UpdateOnboardingPlanRequest;
use App\Http\Resources\Crawler\DiscoveryPolicyVersionResource;
use App\Http\Resources\Crawler\ExtractionPolicyVersionResource;
use App\Http\Resources\Crawler\OnboardingExecutionResource;
use App\Http\Resources\Crawler\OnboardingPlanResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\OnboardingPlan;
use App\Services\Crawler\OnboardingPlanInlinePolicyService;
use App\Services\Crawler\OnboardingPlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OnboardingPlanController extends Controller
{
    public function show(CrawlAgency $crawlAgency): OnboardingPlanResource
    {
        return new OnboardingPlanResource(
            $this->planFor($crawlAgency)->load([
                'executionModel.discoveryPolicy',
                'executionModel.extractionPolicy',
            ]),
        );
    }

    public function update(
        UpdateOnboardingPlanRequest $request,
        CrawlAgency $crawlAgency,
        OnboardingPlanService $service,
    ): OnboardingPlanResource {
        return new OnboardingPlanResource(
            $service->configure($this->planFor($crawlAgency), $request->validated()),
        );
    }

    public function confirm(
        Request $request,
        CrawlAgency $crawlAgency,
        OnboardingPlanService $service,
    ): JsonResponse {
        $execution = $service->confirm($this->planFor($crawlAgency), $request->user());
        $status = $execution->wasRecentlyCreated ? 201 : 200;

        return (new OnboardingExecutionResource($execution))
            ->response()
            ->setStatusCode($status);
    }

    public function saveInlinePolicy(
        SaveOnboardingPlanInlinePolicyRequest $request,
        CrawlAgency $crawlAgency,
        OnboardingPlanInlinePolicyService $service,
    ): DiscoveryPolicyVersionResource|ExtractionPolicyVersionResource {
        $policy = $service->save(
            $this->planFor($crawlAgency),
            $request->validated('kind'),
            $request->validated('name'),
            $request->user(),
        );

        return $request->validated('kind') === 'discovery'
            ? new DiscoveryPolicyVersionResource($policy)
            : new ExtractionPolicyVersionResource($policy);
    }

    private function planFor(CrawlAgency $crawlAgency): OnboardingPlan
    {
        return OnboardingPlan::query()
            ->where('crawl_agency_id', $crawlAgency->id)
            ->firstOrFail();
    }
}
