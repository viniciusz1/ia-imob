<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\ActOnboardingExecutionRequest;
use App\Http\Requests\Crawler\ApproveOnboardingExecutionRequest;
use App\Http\Requests\Crawler\StartOnboardingFirstProductionRequest;
use App\Http\Resources\Crawler\OnboardingExecutionResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\OnboardingExecution;
use App\Services\Crawler\ManualOnboardingExecutionService;
use App\Services\Crawler\OnboardingCompletionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OnboardingExecutionController extends Controller
{
    public function index(CrawlAgency $crawlAgency): AnonymousResourceCollection
    {
        return OnboardingExecutionResource::collection(
            OnboardingExecution::query()
                ->with($this->relations())
                ->where('crawl_agency_id', $crawlAgency->id)
                ->latest('id')
                ->get(),
        );
    }

    public function show(OnboardingExecution $onboardingExecution): OnboardingExecutionResource
    {
        return new OnboardingExecutionResource(
            $onboardingExecution->load($this->relations()),
        );
    }

    public function act(
        ActOnboardingExecutionRequest $request,
        OnboardingExecution $onboardingExecution,
        ManualOnboardingExecutionService $service,
    ): OnboardingExecutionResource {
        return new OnboardingExecutionResource(
            $service->act(
                $onboardingExecution,
                $request->validated('action'),
                $request->validated('sample_url'),
                $request->user(),
            ),
        );
    }

    public function cancel(
        Request $request,
        OnboardingExecution $onboardingExecution,
        ManualOnboardingExecutionService $service,
    ): OnboardingExecutionResource {
        return new OnboardingExecutionResource(
            $service->act(
                $onboardingExecution,
                'cancel',
                null,
                $request->user(),
            ),
        );
    }

    public function approve(
        ApproveOnboardingExecutionRequest $request,
        OnboardingExecution $onboardingExecution,
        OnboardingCompletionService $service,
    ): OnboardingExecutionResource {
        return new OnboardingExecutionResource(
            $service->approve(
                $onboardingExecution,
                $request->validated('reason'),
                $request->user(),
            ),
        );
    }

    public function firstProduction(
        StartOnboardingFirstProductionRequest $request,
        OnboardingExecution $onboardingExecution,
        OnboardingCompletionService $service,
    ): OnboardingExecutionResource {
        return new OnboardingExecutionResource(
            $service->startFirstProduction(
                $onboardingExecution,
                $request->validated('discovery_mode'),
                $request->user(),
            ),
        );
    }

    private function relations(): array
    {
        return [
            'crawlAgency',
            'executionModel',
            'discoveryPolicy',
            'extractionPolicy',
            'discoverySnapshot',
            'extractionProfile',
            'profileValidationReport',
            'firstProductionCrawlRun.qualityReport',
            'operations' => fn ($query) => $query->orderBy('id'),
        ];
    }
}
