<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreOnboardingExecutionModelVersionRequest;
use App\Http\Requests\Crawler\UpdateOnboardingExecutionModelVersionRequest;
use App\Http\Resources\Crawler\OnboardingExecutionModelVersionResource;
use App\Models\Crawler\OnboardingExecutionModelVersion;
use App\Services\Crawler\OnboardingPolicyCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OnboardingExecutionModelVersionController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return OnboardingExecutionModelVersionResource::collection(
            OnboardingExecutionModelVersion::query()
                ->with(['discoveryPolicy', 'extractionPolicy'])
                ->withCount([
                    'onboardingPlans as plan_reference_count',
                    'onboardingExecutions as execution_reference_count',
                ])
                ->orderBy('name')
                ->orderByDesc('version')
                ->get(),
        );
    }

    public function show(
        OnboardingExecutionModelVersion $onboardingExecutionModelVersion,
    ): OnboardingExecutionModelVersionResource {
        return new OnboardingExecutionModelVersionResource(
            $onboardingExecutionModelVersion
                ->load(['discoveryPolicy', 'extractionPolicy'])
                ->loadCount([
                    'onboardingPlans as plan_reference_count',
                    'onboardingExecutions as execution_reference_count',
                ]),
        );
    }

    public function store(
        StoreOnboardingExecutionModelVersionRequest $request,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        return (new OnboardingExecutionModelVersionResource(
            $service->createExecutionModel($request->validated(), $request->user()),
        ))->response()->setStatusCode(201);
    }

    public function update(
        UpdateOnboardingExecutionModelVersionRequest $request,
        OnboardingExecutionModelVersion $onboardingExecutionModelVersion,
        OnboardingPolicyCatalogService $service,
    ): OnboardingExecutionModelVersionResource {
        return new OnboardingExecutionModelVersionResource(
            $service->updateExecutionModel(
                $onboardingExecutionModelVersion,
                $request->validated(),
            ),
        );
    }

    public function publish(
        OnboardingExecutionModelVersion $onboardingExecutionModelVersion,
        OnboardingPolicyCatalogService $service,
    ): OnboardingExecutionModelVersionResource {
        return new OnboardingExecutionModelVersionResource(
            $service->publishExecutionModel($onboardingExecutionModelVersion),
        );
    }

    public function newVersion(
        Request $request,
        OnboardingExecutionModelVersion $onboardingExecutionModelVersion,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        return (new OnboardingExecutionModelVersionResource(
            $service->newExecutionModelVersion(
                $onboardingExecutionModelVersion,
                $request->user(),
            ),
        ))->response()->setStatusCode(201);
    }

    public function archive(
        OnboardingExecutionModelVersion $onboardingExecutionModelVersion,
        OnboardingPolicyCatalogService $service,
    ): OnboardingExecutionModelVersionResource {
        return new OnboardingExecutionModelVersionResource(
            $service->archiveExecutionModel($onboardingExecutionModelVersion),
        );
    }

    public function makeDefault(
        OnboardingExecutionModelVersion $onboardingExecutionModelVersion,
        OnboardingPolicyCatalogService $service,
    ): OnboardingExecutionModelVersionResource {
        return new OnboardingExecutionModelVersionResource(
            $service->makeDefault($onboardingExecutionModelVersion),
        );
    }
}
