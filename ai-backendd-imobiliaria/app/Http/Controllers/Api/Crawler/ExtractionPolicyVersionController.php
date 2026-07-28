<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreExtractionPolicyVersionRequest;
use App\Http\Requests\Crawler\UpdateExtractionPolicyVersionRequest;
use App\Http\Resources\Crawler\ExtractionPolicyVersionResource;
use App\Models\Crawler\ExtractionPolicyVersion;
use App\Services\Crawler\OnboardingPolicyCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ExtractionPolicyVersionController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return ExtractionPolicyVersionResource::collection(
            ExtractionPolicyVersion::query()
                ->withCount([
                    'executionModels as model_reference_count',
                    'executionModels as active_model_reference_count' => fn ($query) => $query
                        ->whereIn('status', ['draft', 'available']),
                ])
                ->orderBy('name')
                ->orderByDesc('version')
                ->get(),
        );
    }

    public function show(ExtractionPolicyVersion $extractionPolicyVersion): ExtractionPolicyVersionResource
    {
        return new ExtractionPolicyVersionResource(
            $extractionPolicyVersion->loadCount([
                'executionModels as model_reference_count',
                'executionModels as active_model_reference_count' => fn ($query) => $query
                    ->whereIn('status', ['draft', 'available']),
            ]),
        );
    }

    public function store(
        StoreExtractionPolicyVersionRequest $request,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        return (new ExtractionPolicyVersionResource(
            $service->createExtractionPolicy($request->validated(), $request->user()),
        ))->response()->setStatusCode(201);
    }

    public function update(
        UpdateExtractionPolicyVersionRequest $request,
        ExtractionPolicyVersion $extractionPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): ExtractionPolicyVersionResource {
        return new ExtractionPolicyVersionResource(
            $service->updateExtractionPolicy($extractionPolicyVersion, $request->validated()),
        );
    }

    public function publish(
        ExtractionPolicyVersion $extractionPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): ExtractionPolicyVersionResource {
        return new ExtractionPolicyVersionResource(
            $service->publishExtractionPolicy($extractionPolicyVersion),
        );
    }

    public function newVersion(
        Request $request,
        ExtractionPolicyVersion $extractionPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        return (new ExtractionPolicyVersionResource(
            $service->newExtractionPolicyVersion($extractionPolicyVersion, $request->user()),
        ))->response()->setStatusCode(201);
    }

    public function archive(
        ExtractionPolicyVersion $extractionPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): ExtractionPolicyVersionResource {
        return new ExtractionPolicyVersionResource(
            $service->archiveExtractionPolicy($extractionPolicyVersion),
        );
    }
}
