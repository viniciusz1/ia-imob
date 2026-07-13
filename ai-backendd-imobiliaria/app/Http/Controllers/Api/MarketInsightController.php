<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OfferMapRequest;
use App\Http\Resources\Api\OfferMapResource;
use App\Services\MarketInsights\OfferMapService;

class MarketInsightController extends Controller
{
    public function __construct(
        private OfferMapService $offerMapService,
    ) {}

    public function offerMap(OfferMapRequest $request): OfferMapResource
    {
        $map = $this->offerMapService->buildMap(
            city: $request->input('city'),
            filters: $request->filters(),
            layer: $request->input('layer', 'stock'),
            concentrationType: $request->input('concentration_type'),
        );

        return new OfferMapResource($map);
    }
}
