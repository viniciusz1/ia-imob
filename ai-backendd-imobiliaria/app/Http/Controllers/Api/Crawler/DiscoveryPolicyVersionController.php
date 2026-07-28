<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreDiscoveryPolicyVersionRequest;
use App\Http\Requests\Crawler\UpdateDiscoveryPolicyVersionRequest;
use App\Http\Resources\Crawler\DiscoveryPolicyVersionResource;
use App\Models\Crawler\DiscoveryPolicyVersion;
use App\Services\Crawler\OnboardingPolicyCatalogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiscoveryPolicyVersionController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return DiscoveryPolicyVersionResource::collection(
            DiscoveryPolicyVersion::query()
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

    public function show(DiscoveryPolicyVersion $discoveryPolicyVersion): DiscoveryPolicyVersionResource
    {
        return new DiscoveryPolicyVersionResource(
            $discoveryPolicyVersion->loadCount([
                'executionModels as model_reference_count',
                'executionModels as active_model_reference_count' => fn ($query) => $query
                    ->whereIn('status', ['draft', 'available']),
            ]),
        );
    }

    public function store(
        StoreDiscoveryPolicyVersionRequest $request,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        return (new DiscoveryPolicyVersionResource(
            $service->createDiscoveryPolicy($request->validated(), $request->user()),
        ))->response()->setStatusCode(201);
    }

    public function update(
        UpdateDiscoveryPolicyVersionRequest $request,
        DiscoveryPolicyVersion $discoveryPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): DiscoveryPolicyVersionResource {
        return new DiscoveryPolicyVersionResource(
            $service->updateDiscoveryPolicy($discoveryPolicyVersion, $request->validated()),
        );
    }

    public function publish(
        DiscoveryPolicyVersion $discoveryPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): DiscoveryPolicyVersionResource {
        return new DiscoveryPolicyVersionResource(
            $service->publishDiscoveryPolicy($discoveryPolicyVersion),
        );
    }

    public function newVersion(
        Request $request,
        DiscoveryPolicyVersion $discoveryPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): JsonResponse {
        return (new DiscoveryPolicyVersionResource(
            $service->newDiscoveryPolicyVersion($discoveryPolicyVersion, $request->user()),
        ))->response()->setStatusCode(201);
    }

    public function archive(
        DiscoveryPolicyVersion $discoveryPolicyVersion,
        OnboardingPolicyCatalogService $service,
    ): DiscoveryPolicyVersionResource {
        return new DiscoveryPolicyVersionResource(
            $service->archiveDiscoveryPolicy($discoveryPolicyVersion),
        );
    }
}
