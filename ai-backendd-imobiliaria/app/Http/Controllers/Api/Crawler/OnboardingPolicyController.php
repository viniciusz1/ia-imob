<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreDiscoveryPolicyVersionRequest;
use App\Http\Requests\Crawler\StoreExtractionPolicyVersionRequest;
use App\Http\Requests\Crawler\StoreOnboardingExecutionModelVersionRequest;
use App\Http\Resources\Crawler\DiscoveryPolicyVersionResource;
use App\Http\Resources\Crawler\ExtractionPolicyVersionResource;
use App\Http\Resources\Crawler\OnboardingExecutionModelVersionResource;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Models\Crawler\OnboardingExecutionModelVersion;
use App\Services\Crawler\OnboardingPolicyCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OnboardingPolicyController extends Controller
{
    public function discoveryPolicies(): AnonymousResourceCollection
    {
        return DiscoveryPolicyVersionResource::collection(
            DiscoveryPolicyVersion::query()->latest('id')->get(),
        );
    }

    public function storeDiscoveryPolicy(
        StoreDiscoveryPolicyVersionRequest $request,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        $resource = new DiscoveryPolicyVersionResource(
            $service->createDiscoveryPolicy($request->validated(), $request->user()),
        );

        return $resource->response()->setStatusCode(201);
    }

    public function extractionPolicies(): AnonymousResourceCollection
    {
        return ExtractionPolicyVersionResource::collection(
            ExtractionPolicyVersion::query()->latest('id')->get(),
        );
    }

    public function storeExtractionPolicy(
        StoreExtractionPolicyVersionRequest $request,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        $resource = new ExtractionPolicyVersionResource(
            $service->createExtractionPolicy($request->validated(), $request->user()),
        );

        return $resource->response()->setStatusCode(201);
    }

    public function executionModels(): AnonymousResourceCollection
    {
        return OnboardingExecutionModelVersionResource::collection(
            OnboardingExecutionModelVersion::query()
                ->with(['discoveryPolicy', 'extractionPolicy'])
                ->latest('id')
                ->get(),
        );
    }

    public function storeExecutionModel(
        StoreOnboardingExecutionModelVersionRequest $request,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        $resource = new OnboardingExecutionModelVersionResource(
            $service->createExecutionModel($request->validated(), $request->user()),
        );

        return $resource->response()->setStatusCode(201);
    }
}
