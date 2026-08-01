<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\ActOnboardingExecutionRequest;
use App\Http\Requests\Crawler\AdoptOnboardingDiscoverySnapshotRequest;
use App\Http\Requests\Crawler\ApproveOnboardingExecutionRequest;
use App\Http\Requests\Crawler\StartOnboardingFirstProductionRequest;
use App\Http\Resources\Crawler\OnboardingExecutionResource;
use App\Models\Crawler\CrawlAgency;
use App\Models\Crawler\DiscoverySnapshot;
use App\Models\Crawler\OnboardingExecution;
use App\Services\Crawler\ManualOnboardingExecutionService;
use App\Services\Crawler\OnboardingCompletionService;
use App\Services\Crawler\OnboardingDiscoveryAdoptionService;
use Illuminate\Http\JsonResponse;
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

    public function discoverySnapshotCandidates(
        OnboardingExecution $onboardingExecution,
        OnboardingDiscoveryAdoptionService $service,
    ): JsonResponse {
        return response()->json([
            'data' => $service->candidates($onboardingExecution),
        ]);
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

    public function adoptDiscoverySnapshot(
        AdoptOnboardingDiscoverySnapshotRequest $request,
        OnboardingExecution $onboardingExecution,
        OnboardingDiscoveryAdoptionService $service,
    ): OnboardingExecutionResource {
        $snapshot = DiscoverySnapshot::query()->findOrFail(
            $request->integer('discovery_snapshot_id'),
        );

        return new OnboardingExecutionResource(
            $service->adopt(
                $onboardingExecution,
                $snapshot,
                $request->user(),
                $request->validated('note'),
            ),
        );
    }

    private function relations(): array
    {
        return [
            'crawlAgency',
            'creator',
            'executionModel',
            'discoveryPolicy',
            'extractionPolicy',
            'discoverySnapshot',
            'discoveryAdoption.actor',
            'extractionProfile',
            'profileValidationReport',
            'firstProductionCrawlRun.qualityReport',
            'operations' => fn ($query) => $query->orderBy('id'),
        ];
    }
}
