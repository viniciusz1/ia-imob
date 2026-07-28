<?php

namespace App\Http\Controllers\Api\Crawler;

use App\Http\Controllers\Controller;
use App\Http\Requests\Crawler\StoreDiscoveryStrategyRequest;
use App\Http\Resources\Crawler\DiscoveryStrategyResource;
use App\Models\Crawler\DiscoveryStrategy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class DiscoveryStrategyController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return DiscoveryStrategyResource::collection(
            DiscoveryStrategy::query()->orderBy('kind')->orderBy('label')->get(),
        );
    }

    public function store(StoreDiscoveryStrategyRequest $request): JsonResponse
    {
        $strategy = DiscoveryStrategy::query()->create([
            ...$request->validated(),
            'kind' => 'custom',
            'active' => true,
            'created_by' => $request->user()->id,
        ]);

        return (new DiscoveryStrategyResource($strategy))
            ->response()
            ->setStatusCode(201);
    }
}
